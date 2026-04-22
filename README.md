# 🌟 Aura Voice Studio

A professional-grade voice cloning and synthesis studio optimized for Apple Silicon. Aura Voice leverages state-of-the-art TTS models to provide high-fidelity voice cloning with minimal reference audio.

![Aura Voice Preview](https://img.shields.io/badge/Aura-Voice-blueviolet?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MPS Optimized](https://img.shields.io/badge/MPS-Optimized-green?style=for-the-badge&logo=apple)

---

## 🚀 Overview

Aura Voice is designed to be a high-performance, low-latency voice cloning platform. It decouples complex ML logic from a sleek, responsive React frontend, utilizing a FastAPI backend that acts as a memory-aware controller for local inference.

### Key Features
- **Zero-Shot Voice Cloning**: Clone voices using just 6-10 seconds of reference audio.
- **Dual Model Support**: Choose between **Coqui XTTS-v2** and **F5-TTS** (MLX Optimized).
- **Mac M4 Optimization**: Full support for **Metal Performance Shaders (MPS)** and **MLX** for blazing-fast inference on Apple Silicon.
- **Real-time Preview**: Integrated waveform visualization using Wavesurfer.js.
- **Memory Management**: Intelligent model switching and memory clearing to optimize unified memory usage.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React (Vite), Tailwind CSS, Framer Motion, Lucide Icons |
| **Backend** | FastAPI, Uvicorn, Python 3.10+ |
| **Inference** | PyTorch (MPS), MLX Framework |
| **Models** | Coqui XTTS-v2, F5-TTS |
| **Audio** | FFmpeg, Pydub, Wavesurfer.js |

---

## 📋 Prerequisites

Ensure you have the following installed on your Mac:
- **Homebrew**: [brew.sh](https://brew.sh/)
- **Node.js**: v18+ 
- **Python**: 3.10+
- **FFmpeg & Espeak**: Required for audio processing and phonemization.

```bash
brew install ffmpeg espeak
```

---

## ⚙️ Setup & Installation

You can use the provided setup script to initialize the project:

```bash
chmod +x setup.sh
./setup.sh
```

### Manual Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Manual Frontend Setup
```bash
cd frontend
npm install
```

---

## 🏃 Running the Application

You will need two terminal windows to run the studio:

### 1. Start the Backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## 📂 Project Structure

```text
aura-voice/
├── backend/            # FastAPI Backend
│   ├── main.py         # Entry point & API routes
│   ├── models/         # Model weights & management
│   ├── utils/          # Audio processing & ML helpers
│   └── temp/           # Transient audio storage
├── frontend/           # React Frontend (Vite)
│   ├── src/            # Application components & hooks
│   └── public/         # Static assets
├── setup.sh            # Automated setup script
└── plan.md             # Architecture & implementation blueprint
```

---

## 🍎 Mac M4 Optimizations

- **MPS Acceleration**: Uses `torch.device("mps")` for GPU-accelerated inference.
- **Half-Precision (float16)**: Reduces memory footprint by 50% for larger models.
- **MLX Support**: Utilizes Apple's MLX framework for F5-TTS to achieve native performance on unified memory architectures.
- **Dynamic Memory Clearing**: Automatically calls `torch.mps.empty_cache()` and performs garbage collection when switching between models to prevent OOM errors on 16GB configurations.

---

## 📝 License

This project is intended for research and creative purposes. Please adhere to the licenses of the underlying models (Coqui XTTS-v2 and F5-TTS).
