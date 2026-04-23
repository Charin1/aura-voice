# 🌟 Aura Voice Studio

A professional-grade voice cloning and synthesis studio optimized for Apple Silicon. Aura Voice uses WhisperX forced alignment + silence-aware chunking to produce high-fidelity voice clones from as little as 10 seconds of reference audio.

![Aura Voice Preview](https://img.shields.io/badge/Aura-Voice-blueviolet?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MPS Optimized](https://img.shields.io/badge/MPS-Optimized-green?style=for-the-badge&logo=apple)

---

## 🚀 Overview

Aura Voice decouples complex ML logic from a sleek React frontend via a FastAPI backend that acts as a memory-aware controller for local inference. The precision alignment pipeline ensures that every TTS model receives perfectly timed transcripts — the single biggest factor in voice cloning quality.

### Key Features
- **Precision Alignment Pipeline**: WhisperX `large-v3` forced alignment produces word-level timestamps. Reference audio is silence-split into 5–15s chunks, each with a precisely matched transcript.
- **Smart Chunk Selection**: At synthesis time, the best chunk is automatically chosen based on each model's ideal duration (XTTS: 6–10s, F5-TTS: 8–15s).
- **Zero-Shot Voice Cloning**: Clone voices using short reference audio — no fine-tuning required.
- **Dual Model Support**: Choose between **Coqui XTTS-v2** (multilingual) and **F5-TTS MLX** (Apple Silicon native).
- **Voice Library**: Manage voice profiles with Aligned / Legacy status badges and one-click re-processing for older references.
- **No Cold-Start**: `setup.sh` pre-downloads all models so first launch is instant.
- **Mac M4 Optimization**: WhisperX on CPU (int8), TTS inference on MPS — zero memory contention.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React (Vite), Tailwind CSS, Framer Motion, Lucide Icons |
| **Backend** | FastAPI, Uvicorn, Python 3.11 |
| **Alignment** | WhisperX `large-v3` + wav2vec2 forced phoneme alignment |
| **Inference** | PyTorch (MPS), MLX Framework |
| **Models** | Coqui XTTS-v2, F5-TTS MLX, OpenAI Whisper (fallback) |
| **Audio** | FFmpeg (conversion), Pydub (silence detection, normalization) |
| **Storage** | `library_metadata.json` + `references/` chunk directories |

---

## 📋 Prerequisites

- **macOS** with Apple Silicon (M1/M2/M3/M4) — 16 GB RAM recommended
- **Homebrew**: [brew.sh](https://brew.sh/)
- **Node.js** v18+
- **Python** 3.11
- **FFmpeg & Espeak**: `brew install ffmpeg espeak`

---

## ⚙️ Setup & Installation

The setup script handles everything — deps, Python environment, model downloads, and frontend:

```bash
chmod +x setup.sh
./setup.sh
```

This runs four steps automatically:
1. **System deps** — `ffmpeg`, `espeak` via Homebrew
2. **Python env** — creates `.venv` and installs `requirements.txt`
3. **Model pre-download** — WhisperX, XTTS-v2, F5-TTS, wav2vec2, whisper-base (~5 GB total, runs once)
4. **Frontend** — `npm install`

### Manual steps (if needed)
```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python preload_models.py   # pre-download models

# Frontend
cd ../frontend && npm install
```

---

## 🏃 Running the Application

```bash
./start.sh
```

That's it. Both servers start automatically:
- **Backend**: `http://localhost:8000`
- **Frontend**: `http://localhost:5173`

Press `Ctrl+C` to stop both.

---

## 📂 Project Structure

```text
aura-voice/
├── backend/
│   ├── main.py                  # FastAPI routes: upload, synthesize, reprocess, library, stats
│   ├── preload_models.py        # One-time model pre-downloader (run by setup.sh)
│   ├── models/
│   │   └── manager.py           # Memory-aware singleton model loader (MPS)
│   ├── utils/
│   │   ├── compat.py            # All library compatibility patches (import first!)
│   │   ├── alignment.py         # WhisperX alignment + silence chunking pipeline
│   │   └── audio.py             # FFmpeg conversion, normalization helpers
│   ├── references/              # Voice profiles: master WAV + chunk dirs + manifest.json
│   ├── output/                  # Generated audio samples
│   └── library_metadata.json   # Persistent metadata for all profiles & generations
├── frontend/
│   └── src/
│       └── components/          # Studio, Library, Settings, Analytics
├── setup.sh                     # Full environment bootstrap
└── start.sh                     # Dev server launcher (explicit venv paths)
```

---

## 🎙️ How the Alignment Pipeline Works

1. **Upload** reference audio → convert to 24kHz mono WAV → peak-normalize to −1 dBFS
2. **WhisperX** transcribes with VAD, then performs forced phoneme alignment → word-level timestamps
3. **Silence-aware chunking** splits audio at natural pauses into 5–15s segments
4. Each chunk gets a `.txt` file with only the words that fall within its time window
5. A `manifest.json` records all chunk metadata and the `alignment_available` flag
6. **Synthesis** reads the manifest and picks the chunk whose duration best suits the model

This eliminates the #1 cause of voice cloning artifacts: misaligned transcripts.

---

## 🍎 Apple Silicon Optimizations

| Optimization | Detail |
| :--- | :--- |
| **WhisperX on CPU** | Runs int8 quantized — keeps MPS free for TTS inference |
| **XTTS-v2 on CPU** | MPS has op constraints that break XTTS; CPU is more stable |
| **F5-TTS on MPS/MLX** | Native Apple Silicon path via `f5-tts-mlx` |
| **float16 inference** | 50% memory reduction for large models |
| **MPS cache clearing** | `torch.mps.empty_cache()` + `gc.collect()` before each model switch |

---

## 📝 License

Intended for research and creative use. Adhere to the licenses of the underlying models: [Coqui XTTS-v2](https://coqui.ai/cpml) and [F5-TTS](https://github.com/SWivid/F5-TTS/blob/main/LICENSE).
