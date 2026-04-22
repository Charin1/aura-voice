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
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

from fastapi.staticfiles import StaticFiles
app.mount("/output", StaticFiles(directory=OUTPUT_DIR), name="output")

def _transcript_path(reference_id: str) -> str:
    return os.path.join(TEMP_DIR, f"{reference_id}.txt")

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
        proc_path = os.path.join(TEMP_DIR, f"{file_id}.wav")

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

        ref_path = os.path.join(TEMP_DIR, f"{reference_id}.wav")
        if not os.path.exists(ref_path):
            raise HTTPException(status_code=404, detail="Reference audio not found")

        try:
            try:
                model = model_manager.load_model(model_type)
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=str(e))
            output_file = os.path.join(OUTPUT_DIR, f"{uuid.uuid4()}.wav")

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
    """Returns a list of generated clips from the output directory."""
    clips = []
    if os.path.exists(OUTPUT_DIR):
        for filename in os.listdir(OUTPUT_DIR):
            if filename.endswith(".wav"):
                file_path = os.path.join(OUTPUT_DIR, filename)
                stats = os.stat(file_path)
                clips.append({
                    "id": filename,
                    "filename": filename,
                    "size": stats.st_size,
                    "created_at": stats.st_mtime,
                    "url": f"/output/{filename}"
                })
    return sorted(clips, key=lambda x: x["created_at"], reverse=True)

@app.get("/stats")
async def get_stats():
    """Returns system and model statistics."""
    import importlib.util

    # Avoid importing heavy ML deps on a frequent polling endpoint.
    xtts_available = importlib.util.find_spec("TTS") is not None
    f5_available = importlib.util.find_spec("f5_tts_mlx") is not None
    whisper_available = importlib.util.find_spec("whisper") is not None

    return {
        "device": model_manager.device,
        "current_model": model_manager.current_model_type,
        "mps_available": torch.backends.mps.is_available(),
        "multipart_available": _MULTIPART_AVAILABLE,
        "models_available": {"xtts": xtts_available, "f5": f5_available, "whisper": whisper_available},
        "memory_info": "Usage stats would go here (requires psutil)"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
