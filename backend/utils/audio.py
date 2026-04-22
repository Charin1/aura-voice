import os
import subprocess

_whisper_model = None

def convert_audio(input_path, output_path, sample_rate=24000):
    """Converts audio to the required format: Mono, 24kHz, 16-bit PCM."""
    command = [
        "ffmpeg", "-i", input_path,
        "-ac", "1",
        "-ar", str(sample_rate),
        "-sample_fmt", "s16",
        "-y", output_path
    ]
    subprocess.run(command, check=True)

def trim_audio(input_path, output_path, start=0, duration=10):
    """Trims audio to a specific duration."""
    command = [
        "ffmpeg", "-i", input_path,
        "-ss", str(start),
        "-t", str(duration),
        "-c", "copy",
        "-y", output_path
    ]
    subprocess.run(command, check=True)

def transcribe_audio(file_path):
    """Transcribes audio using Whisper (base model)."""
    global _whisper_model
    # Lazy import so backend can start even if Whisper isn't installed yet.
    try:
        import whisper
    except Exception as e:
        raise RuntimeError(
            "Whisper dependency missing. Install `openai-whisper` (and ffmpeg), "
            "then restart the backend."
        ) from e

    # Use CPU for whisper to keep MPS free for TTS models.
    if _whisper_model is None:
        model_name = os.getenv("WHISPER_MODEL", "base")
        _whisper_model = whisper.load_model(model_name, device="cpu")

    result = _whisper_model.transcribe(file_path)
    return (result.get("text") or "").strip()
