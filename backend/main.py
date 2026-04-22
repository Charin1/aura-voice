from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
import torch
from models.manager import model_manager
from utils.audio import convert_audio, transcribe_audio
import scipy.io.wavfile as wavfile

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

try:
    import multipart  # noqa: F401

    _MULTIPART_AVAILABLE = True
except Exception:
    _MULTIPART_AVAILABLE = False

if _MULTIPART_AVAILABLE:
    @app.post("/upload-reference")
    async def upload_reference(file: UploadFile = File(...)):
        """Uploads and processes reference audio for cloning."""
        file_id = str(uuid.uuid4())
        raw_path = os.path.join(TEMP_DIR, f"{file_id}_raw{os.path.splitext(file.filename)[1]}")
        proc_path = os.path.join(REFERENCES_DIR, f"{file_id}.wav")

        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        try:
            # Convert to 24kHz mono PCM for F5, which also works for XTTS
            convert_audio(raw_path, proc_path)
            transcript = ""
            warning = None
            try:
                transcript = transcribe_audio(proc_path)
                with open(_transcript_path(file_id), "w", encoding="utf-8") as f:
                    f.write(transcript)
            except Exception as e:
                # Don't fail the upload if transcription is unavailable; UI can still proceed.
                warning = f"Transcription unavailable: {str(e)}"
                
            # Save metadata
            meta = load_metadata()
            import time
            meta["references"][file_id] = {
                "id": file_id,
                "transcript": transcript,
                "timestamp": int(time.time()),
                "url": f"/references/{file_id}.wav"
            }
            save_metadata(meta)

            # Cleanup raw file
            if os.path.exists(raw_path):
                os.remove(raw_path)
            
            return {
                "id": file_id,
                "transcript": transcript,
                "warning": warning,
                "message": "Reference audio processed successfully.",
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/synthesize")
    async def synthesize(
        text: str = Form(...),
        model_type: str = Form("xtts"),
        reference_id: str = Form(...),
    ):
        """Synthesizes speech using the selected model and reference audio."""
        if model_type not in {"xtts", "f5"}:
            raise HTTPException(status_code=400, detail=f"Unsupported model_type: {model_type}")

        ref_path = os.path.join(REFERENCES_DIR, f"{reference_id}.wav")
        if not os.path.exists(ref_path):
            raise HTTPException(status_code=404, detail="Reference audio not found")

        try:
            try:
                model = model_manager.load_model(model_type)
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=str(e))
            output_id = str(uuid.uuid4())
            output_file = os.path.join(OUTPUT_DIR, f"{output_id}.wav")

            if model_type == "xtts":
                if model is None:
                    raise HTTPException(status_code=500, detail="XTTS model failed to load")
                model.tts_to_file(text=text, speaker_wav=ref_path, language="en", file_path=output_file)

            elif model_type == "f5":
                try:
                    from f5_tts_mlx.generate import generate
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"F5 generate import failed: {str(e)}")

                ref_text = ""
                tpath = _transcript_path(reference_id)
                if os.path.exists(tpath):
                    try:
                        with open(tpath, "r", encoding="utf-8") as f:
                            ref_text = f.read().strip()
                    except Exception:
                        ref_text = ""
                if not ref_text:
                    ref_text = transcribe_audio(ref_path)

                import numpy as np
                generate(
                    generation_text=text,
                    ref_audio_path=ref_path,
                    ref_audio_text=ref_text,
                    output_path=output_file,
                )

            # Save metadata
            meta = load_metadata()
            import time
            meta["generations"].append({
                "id": output_id,
                "reference_id": reference_id,
                "text": text,
                "model_type": model_type,
                "timestamp": int(time.time()),
                "url": f"/output/{output_id}.wav"
            })
            save_metadata(meta)

            return FileResponse(output_file, media_type="audio/wav")

        except HTTPException:
            raise
        except Exception as e:
            import traceback
            traceback.print_exc()
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

    meta = load_metadata()
    generations = meta.get("generations", [])
    model_counts = {"f5": 0, "xtts": 0, "unknown": 0}
    for g in generations:
        m_type = g.get("model_type", "unknown").lower()
        if m_type in model_counts:
            model_counts[m_type] += 1
        else:
            model_counts["unknown"] += 1

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
        "models_available": {"xtts": xtts_available, "f5": f5_available, "whisper": whisper_available},
        "library": {
            "total_voices": len(meta.get("references", {})),
            "total_generations": len(generations),
            "model_distribution": model_counts
        },
        "simulated_hardware": {
            "mps_load": sim_mps_load,
            "memory_load": sim_mem_load
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
