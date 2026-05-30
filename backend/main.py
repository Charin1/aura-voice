import utils.compat  # noqa: F401 — must be first; applies all ML library patches
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
import torch
from models.manager import model_manager
from utils.audio import convert_audio, transcribe_audio
from utils.alignment import (
    prepare_reference,
    best_chunk_for_model,
    load_manifest,
    chunk_dir_for_reference,
)
import scipy.io.wavfile as wavfile
from utils.text import split_text_into_chunks
from pydub import AudioSegment
import asyncio
from fastapi.responses import StreamingResponse

app = FastAPI(title="Aura Voice Studio API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
REFERENCES_DIR = os.path.join(BASE_DIR, "references")
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(REFERENCES_DIR, exist_ok=True)

METADATA_FILE = os.path.join(OUTPUT_DIR, "library_metadata.json")
import json

from fastapi.staticfiles import StaticFiles
app.mount("/output", StaticFiles(directory=OUTPUT_DIR), name="output")

def _transcript_path(reference_id: str) -> str:
    return os.path.join(REFERENCES_DIR, f"{reference_id}.txt")

def load_metadata():
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {"references": {}, "generations": []}

def save_metadata(data):
    with open(METADATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def migrate_legacy_clips():
    """Scan output/ for .wav files without metadata and add them to a 'Legacy' profile."""
    import time
    meta = load_metadata()
    
    # Find all .wav files in output that have no matching generation entry
    # 1. MIGRATE OUTPUTS (ORPHANED CLIPS)
    known_ids = {g["id"] for g in meta.get("generations", [])}
    orphans = []
    if os.path.exists(OUTPUT_DIR):
        for filename in os.listdir(OUTPUT_DIR):
            if filename.endswith(".wav"):
                file_id = filename.replace(".wav", "")
                if file_id not in known_ids and filename != "library_metadata.json":
                    stat = os.stat(os.path.join(OUTPUT_DIR, filename))
                    orphans.append({"id": file_id, "created_at": stat.st_mtime})
    
    if orphans:
        LEGACY_ID = "legacy-imports"
        if LEGACY_ID not in meta.get("references", {}):
            meta.setdefault("references", {})[LEGACY_ID] = {
                "id": LEGACY_ID,
                "transcript": "Imported before Voice Hub tracking was enabled.",
                "timestamp": int(time.time()),
                "url": None
            }
        
        for orphan in orphans:
            meta["generations"].append({
                "id": orphan["id"],
                "reference_id": LEGACY_ID,
                "text": "(Text not recorded)",
                "model_type": "unknown",
                "timestamp": int(orphan["created_at"]),
                "url": f"/output/{orphan['id']}.wav"
            })

    # 2. MIGRATE TEMP (RECOVERABLE REFERENCES)
    if os.path.exists(TEMP_DIR):
        for filename in os.listdir(TEMP_DIR):
            if filename.endswith(".wav") and "_raw" not in filename:
                file_id = filename.replace(".wav", "")
                if file_id not in meta["references"]:
                    src_wav = os.path.join(TEMP_DIR, filename)
                    src_txt = os.path.join(TEMP_DIR, f"{file_id}.txt")
                    dest_wav = os.path.join(REFERENCES_DIR, filename)
                    dest_txt = os.path.join(REFERENCES_DIR, f"{file_id}.txt")
                    
                    # Move files
                    shutil.move(src_wav, dest_wav)
                    transcript = ""
                    if os.path.exists(src_txt):
                        shutil.move(src_txt, dest_txt)
                        try:
                            with open(dest_txt, "r") as f:
                                transcript = f.read()
                        except: pass
                    
                    stat = os.stat(dest_wav)
                    meta["references"][file_id] = {
                        "id": file_id,
                        "transcript": transcript,
                        "timestamp": int(stat.st_mtime),
                        "url": f"/references/{file_id}.wav"
                    }
            # Clean up _raw files in temp
            elif "_raw" in filename:
                try: os.remove(os.path.join(TEMP_DIR, filename))
                except: pass

    save_metadata(meta)

# Run migration on server startup to import pre-existing files
migrate_legacy_clips()

# -------------------------------------------------------------
# TASK QUEUE & LOAD MANAGER CONFIGURATION
# -------------------------------------------------------------
class SynthesisJob:
    def __init__(self, job_id, text, model_type, reference_id, speed, temperature, cfg_strength, is_stream):
        self.job_id = job_id
        self.text = text
        self.model_type = model_type
        self.reference_id = reference_id
        self.speed = speed
        self.temperature = temperature
        self.cfg_strength = cfg_strength
        self.is_stream = is_stream
        self.update_queue = asyncio.Queue()
        self.done = False

synthesis_queue = asyncio.Queue()
active_job_id = None

def execute_blocking_tts(model_type, chunk, effective_ref_path, language, chunk_file, effective_ref_text, speed, temperature, cfg_strength):
    model = model_manager.load_model(model_type)
    if model_type == "xtts":
        if model is None:
            raise Exception("XTTS model failed to load")
        model.tts_to_file(
            text=chunk,
            speaker_wav=effective_ref_path,
            language=language,
            file_path=chunk_file,
            speed=speed,
            temperature=temperature,
        )
    elif model_type == "f5":
        from f5_tts_mlx.generate import generate
        generate(
            generation_text=chunk,
            ref_audio_path=effective_ref_path,
            ref_audio_text=effective_ref_text,
            output_path=chunk_file,
            speed=speed,
            cfg_strength=cfg_strength,
        )

async def run_synthesis_job(job: SynthesisJob):
    ref_path = os.path.join(REFERENCES_DIR, f"{job.reference_id}.wav")
    if not os.path.exists(ref_path):
        await job.update_queue.put({"event": "error", "detail": "Reference audio not found"})
        return

    chunk_dir = chunk_dir_for_reference(REFERENCES_DIR, job.reference_id)
    best_chunk = best_chunk_for_model(chunk_dir, job.model_type)

    effective_ref_path = best_chunk.path if best_chunk and os.path.exists(best_chunk.path) else ref_path
    effective_ref_text = best_chunk.transcript if best_chunk else ""

    if not effective_ref_text:
        tpath = _transcript_path(job.reference_id)
        if os.path.exists(tpath):
            try:
                with open(tpath, "r", encoding="utf-8") as f:
                    effective_ref_text = f.read().strip()
            except Exception:
                pass

    text_chunks = split_text_into_chunks(job.text, max_chars=250)
    total_chunks = len(text_chunks)
    output_file = os.path.join(OUTPUT_DIR, f"{job.job_id}.wav")
    temp_output_files = []

    try:
        await job.update_queue.put({"event": "started", "total_chunks": total_chunks})

        for i, chunk in enumerate(text_chunks):
            await job.update_queue.put({
                "event": "progress",
                "current_chunk": i + 1,
                "total_chunks": total_chunks,
                "text": chunk
            })

            chunk_file = os.path.join(TEMP_DIR, f"{job.job_id}_chunk_{i}.wav")

            # Execute the heavy ML inference in a separate thread to keep the main event loop free
            await asyncio.to_thread(
                execute_blocking_tts,
                job.model_type,
                chunk,
                effective_ref_path,
                "en",
                chunk_file,
                effective_ref_text,
                job.speed,
                job.temperature,
                job.cfg_strength
            )

            temp_output_files.append(chunk_file)

            # Save the chunk wav to a public location so the frontend can stream-play it
            chunk_public_dir = os.path.join(OUTPUT_DIR, "chunks")
            os.makedirs(chunk_public_dir, exist_ok=True)
            chunk_public_path = os.path.join(chunk_public_dir, f"{job.job_id}_chunk_{i}.wav")
            shutil.copy(chunk_file, chunk_public_path)

            # Send chunk completion event with the URL
            await job.update_queue.put({
                "event": "chunk_completed",
                "chunk_index": i,
                "chunk_url": f"/output/chunks/{job.job_id}_chunk_{i}.wav"
            })

        # Merge audio chunks
        await job.update_queue.put({"event": "merging"})
        
        if len(temp_output_files) == 1:
            shutil.move(temp_output_files[0], output_file)
        else:
            def merge_files(files, dest):
                combined = AudioSegment.empty()
                for file in files:
                    segment = AudioSegment.from_wav(file)
                    combined += segment
                    if os.path.exists(file):
                        os.remove(file)
                combined.export(dest, format="wav")
            await asyncio.to_thread(merge_files, temp_output_files, output_file)

        # Save metadata
        meta = load_metadata()
        import time
        meta["generations"].append({
            "id": job.job_id,
            "reference_id": job.reference_id,
            "text": job.text,
            "model_type": job.model_type,
            "timestamp": int(time.time()),
            "url": f"/output/{job.job_id}.wav",
            "used_aligned_chunk": best_chunk is not None,
            "chunk_index": best_chunk.index if best_chunk else None,
        })
        save_metadata(meta)

        await job.update_queue.put({
            "event": "completed",
            "url": f"/output/{job.job_id}.wav",
            "id": job.job_id,
            "text": job.text
        })

    except Exception as e:
        for f in temp_output_files:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except:
                    pass
        raise e

async def synthesis_worker():
    global active_job_id
    while True:
        job = await synthesis_queue.get()
        active_job_id = job.job_id
        try:
            await run_synthesis_job(job)
        except Exception as e:
            import traceback
            traceback.print_exc()
            await job.update_queue.put({"event": "error", "detail": str(e)})
        finally:
            job.done = True
            active_job_id = None
            synthesis_queue.task_done()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(synthesis_worker())


try:
    import multipart  # noqa: F401

    _MULTIPART_AVAILABLE = True
except Exception:
    _MULTIPART_AVAILABLE = False

if _MULTIPART_AVAILABLE:
    @app.post("/upload-reference")
    async def upload_reference(file: UploadFile = File(...)):
        """
        Uploads and processes reference audio for cloning.

        Pipeline:
        1. Convert to 24 kHz mono PCM WAV.
        2. Peak-normalize to -1 dBFS.
        3. WhisperX forced alignment → word-level timestamps.
        4. Silence-aware chunking into 5–15 s segments.
        5. Each chunk gets a precisely-trimmed aligned transcript.
        """
        file_id = str(uuid.uuid4())
        ext = os.path.splitext(file.filename)[1] or ".wav"
        raw_path = os.path.join(TEMP_DIR, f"{file_id}_raw{ext}")
        proc_path = os.path.join(REFERENCES_DIR, f"{file_id}.wav")
        chunk_dir = chunk_dir_for_reference(REFERENCES_DIR, file_id)

        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        try:
            # Step 1: Convert to 24 kHz mono PCM
            convert_audio(raw_path, proc_path)

            # Cleanup raw immediately
            if os.path.exists(raw_path):
                os.remove(raw_path)

            # Steps 2-5: Full alignment + chunking pipeline
            warning = None
            alignment_available = False
            chunk_count = 0
            transcript = ""

            try:
                prepared = prepare_reference(
                    normalized_audio_path=proc_path,
                    chunk_dir=chunk_dir,
                )
                transcript = prepared.full_transcript
                alignment_available = prepared.alignment_available
                chunk_count = len(prepared.chunks)

                # Also write the legacy .txt for backwards compat
                with open(_transcript_path(file_id), "w", encoding="utf-8") as f:
                    f.write(transcript)

            except Exception as e:
                warning = f"Alignment pipeline failed, using plain transcription: {str(e)}"
                try:
                    transcript = transcribe_audio(proc_path)
                    with open(_transcript_path(file_id), "w", encoding="utf-8") as f:
                        f.write(transcript)
                except Exception as te:
                    warning += f" | Transcription also failed: {str(te)}"

            # Save metadata
            meta = load_metadata()
            import time
            meta["references"][file_id] = {
                "id": file_id,
                "transcript": transcript,
                "timestamp": int(time.time()),
                "url": f"/references/{file_id}.wav",
                "alignment_available": alignment_available,
                "chunk_count": chunk_count,
            }
            save_metadata(meta)

            return {
                "id": file_id,
                "transcript": transcript,
                "warning": warning,
                "alignment_available": alignment_available,
                "chunk_count": chunk_count,
                "message": "Reference audio processed successfully.",
            }
        except Exception as e:
            import traceback; traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/synthesize")
    async def synthesize(
        text: str = Form(...),
        model_type: str = Form("xtts"),
        reference_id: str = Form(...),
        speed: float = Form(1.0),
        temperature: float = Form(0.75),
        cfg_strength: float = Form(2.0),
    ):
        """
        Synthesizes speech using the selected model and reference audio by enqueuing
        the task in the global sequential queue and returning the file on completion.
        """
        job_id = str(uuid.uuid4())
        job = SynthesisJob(
            job_id=job_id,
            text=text,
            model_type=model_type,
            reference_id=reference_id,
            speed=speed,
            temperature=temperature,
            cfg_strength=cfg_strength,
            is_stream=False
        )

        await synthesis_queue.put(job)

        while True:
            event_data = await job.update_queue.get()
            event = event_data.get("event")
            if event == "completed":
                output_file = os.path.join(OUTPUT_DIR, f"{job_id}.wav")
                return FileResponse(output_file, media_type="audio/wav")
            elif event == "error":
                raise HTTPException(status_code=500, detail=event_data.get("detail"))

    @app.post("/synthesize-stream")
    async def synthesize_stream(
        text: str = Form(...),
        model_type: str = Form("xtts"),
        reference_id: str = Form(...),
        speed: float = Form(1.0),
        temperature: float = Form(0.75),
        cfg_strength: float = Form(2.0),
    ):
        """
        Synthesizes speech using the selected model and reference audio, yielding
        real-time progress updates and queue position as an SSE stream.
        """
        job_id = str(uuid.uuid4())
        job = SynthesisJob(
            job_id=job_id,
            text=text,
            model_type=model_type,
            reference_id=reference_id,
            speed=speed,
            temperature=temperature,
            cfg_strength=cfg_strength,
            is_stream=True
        )

        async def event_generator():
            # Get initial queue position
            qsize = synthesis_queue.qsize()
            pos = qsize + (1 if active_job_id is not None else 0)
            
            await synthesis_queue.put(job)
            
            if pos > 0:
                yield f"data: {json.dumps({'event': 'queued', 'position': pos})}\n\n"
                
            while True:
                event_data = await job.update_queue.get()
                yield f"data: {json.dumps(event_data)}\n\n"
                if event_data.get("event") in ("completed", "error"):
                    break

        from fastapi.responses import StreamingResponse
        return StreamingResponse(event_generator(), media_type="text/event-stream")

    @app.post("/reprocess-reference/{ref_id}")
    async def reprocess_reference(ref_id: str):
        """
        Re-run the full alignment + chunking pipeline on an existing reference.
        Useful for upgrading legacy references that were uploaded before the
        alignment pipeline was added.
        """
        ref_path = os.path.join(REFERENCES_DIR, f"{ref_id}.wav")
        if not os.path.exists(ref_path):
            raise HTTPException(status_code=404, detail="Reference audio not found")

        chunk_dir = chunk_dir_for_reference(REFERENCES_DIR, ref_id)

        # Remove old chunk directory if it exists (full reprocess)
        if os.path.exists(chunk_dir):
            shutil.rmtree(chunk_dir)

        try:
            prepared = prepare_reference(
                normalized_audio_path=ref_path,
                chunk_dir=chunk_dir,
            )

            # Update metadata
            meta = load_metadata()
            if ref_id in meta.get("references", {}):
                meta["references"][ref_id]["transcript"] = prepared.full_transcript
                meta["references"][ref_id]["alignment_available"] = prepared.alignment_available
                meta["references"][ref_id]["chunk_count"] = len(prepared.chunks)
                save_metadata(meta)

            # Update legacy .txt too
            with open(_transcript_path(ref_id), "w", encoding="utf-8") as f:
                f.write(prepared.full_transcript)

            return {
                "id": ref_id,
                "alignment_available": prepared.alignment_available,
                "chunk_count": len(prepared.chunks),
                "transcript": prepared.full_transcript,
                "message": "Reference reprocessed with alignment pipeline.",
            }
        except Exception as e:
            import traceback; traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

else:
    @app.post("/upload-reference")
    async def upload_reference_unavailable():
        raise HTTPException(
            status_code=503,
            detail='Missing dependency "python-multipart". Install it with: pip install python-multipart',
        )

    @app.post("/synthesize")
    async def synthesize_unavailable():
        raise HTTPException(
            status_code=503,
            detail='Missing dependency "python-multipart". Install it with: pip install python-multipart',
        )

    @app.post("/synthesize-stream")
    async def synthesize_stream_unavailable():
        raise HTTPException(
            status_code=503,
            detail='Missing dependency "python-multipart". Install it with: pip install python-multipart',
        )

@app.get("/library")
async def get_library():
    """Returns structured library data grouped by reference profiles."""
    meta = load_metadata()
    
    # Build grouped structure
    profiles = []
    for ref_id, ref_data in meta.get("references", {}).items():
        # Find all generations for this reference
        gens = [g for g in meta.get("generations", []) if g.get("reference_id") == ref_id]
        # Sort generations by timestamp descending
        gens.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        
        profile = dict(ref_data)
        profile["tags"] = ref_data.get("tags", [])
        profile["category"] = ref_data.get("category", "General")
        profile["generations"] = gens
        profiles.append(profile)
        
    # Sort profiles by timestamp descending
    profiles.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return profiles

@app.get("/references/{filename}")
async def serve_reference_audio(filename: str):
    """Serve a reference voice audio file."""
    file_path = os.path.join(REFERENCES_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Reference audio not found")
    return FileResponse(file_path, media_type="audio/wav")

@app.put("/library/profile/{ref_id}/metadata")
async def update_profile_metadata(ref_id: str, payload: dict):
    """Updates custom metadata (tags and category) for a voice profile."""
    meta = load_metadata()
    if ref_id not in meta.get("references", {}):
        raise HTTPException(status_code=404, detail="Profile not found")
    
    meta["references"][ref_id]["tags"] = payload.get("tags", [])
    meta["references"][ref_id]["category"] = payload.get("category", "General")
    save_metadata(meta)
    return {"status": "success"}

@app.delete("/library/profile/{ref_id}")
async def delete_profile(ref_id: str):
    """Delete a voice profile and all its generated clips (cascade)."""
    meta = load_metadata()

    if ref_id not in meta.get("references", {}):
        raise HTTPException(status_code=404, detail="Profile not found")

    # Delete reference audio file from disk
    ref_audio = os.path.join(REFERENCES_DIR, f"{ref_id}.wav")
    if os.path.exists(ref_audio):
        os.remove(ref_audio)

    # Find and delete all associated generation files
    surviving = []
    for gen in meta.get("generations", []):
        if gen.get("reference_id") == ref_id:
            gen_file = os.path.join(OUTPUT_DIR, f"{gen['id']}.wav")
            if os.path.exists(gen_file):
                os.remove(gen_file)
        else:
            surviving.append(gen)

    meta["generations"] = surviving
    del meta["references"][ref_id]
    save_metadata(meta)
    return {"status": "deleted"}

@app.delete("/library/generation/{gen_id}")
async def delete_generation(gen_id: str):
    """Delete a single generated audio clip."""
    meta = load_metadata()

    gen = next((g for g in meta.get("generations", []) if g["id"] == gen_id), None)
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")

    # Delete file from disk
    gen_file = os.path.join(OUTPUT_DIR, f"{gen_id}.wav")
    if os.path.exists(gen_file):
        os.remove(gen_file)

    meta["generations"] = [g for g in meta["generations"] if g["id"] != gen_id]
    save_metadata(meta)
    return {"status": "deleted"}

@app.get("/stats")
async def get_stats():
    """Returns system and model statistics."""
    import importlib.util

    # Avoid importing heavy ML deps on a frequent polling endpoint.
    xtts_available = importlib.util.find_spec("TTS") is not None
    f5_available = importlib.util.find_spec("f5_tts_mlx") is not None
    whisper_available = importlib.util.find_spec("whisper") is not None
    whisperx_available = importlib.util.find_spec("whisperx") is not None

    meta = load_metadata()
    generations = meta.get("generations", [])
    references = meta.get("references", {})
    model_counts = {"f5": 0, "xtts": 0, "unknown": 0}
    aligned_gen_count = 0
    for g in generations:
        m_type = g.get("model_type", "unknown").lower()
        if m_type in model_counts:
            model_counts[m_type] += 1
        else:
            model_counts["unknown"] += 1
        if g.get("used_aligned_chunk"):
            aligned_gen_count += 1

    aligned_ref_count = sum(
        1 for r in references.values() if r.get("alignment_available")
    )

    # Simulated load based on active state
    is_active = model_manager.current_model_type is not None
    import random
    sim_mps_load = random.randint(40, 65) if is_active else random.randint(2, 8)
    sim_mem_load = random.randint(25, 45) if is_active else random.randint(12, 18)

    return {
        "device": model_manager.device,
        "current_model": model_manager.current_model_type,
        "mps_available": torch.backends.mps.is_available(),
        "multipart_available": _MULTIPART_AVAILABLE,
        "models_available": {
            "xtts": xtts_available,
            "f5": f5_available,
            "whisper": whisper_available,
            "whisperx": whisperx_available,
        },
        "library": {
            "total_voices": len(references),
            "total_generations": len(generations),
            "model_distribution": model_counts,
            "aligned_references": aligned_ref_count,
            "aligned_generations": aligned_gen_count,
        },
        "simulated_hardware": {
            "mps_load": sim_mps_load,
            "memory_load": sim_mem_load
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
