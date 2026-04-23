#!/bin/bash

# Aura Voice Setup Script
echo "🌟 Initializing Aura Voice Studio..."

# ──────────────────────────────────────────────
# 1. System Dependencies
# ──────────────────────────────────────────────
echo ""
echo "📦 [1/4] Checking system dependencies..."
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found. Please install it from https://brew.sh/"
    exit 1
fi

brew install ffmpeg espeak

# ──────────────────────────────────────────────
# 2. Python Backend Environment
# ──────────────────────────────────────────────
echo ""
echo "🐍 [2/4] Setting up Python environment..."
cd backend

if command -v uv &> /dev/null; then
    echo "⚡ Using uv for faster setup..."
    uv venv --python 3.11
    source .venv/bin/activate
    uv pip install -r requirements.txt
else
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
fi

# ──────────────────────────────────────────────
# 3. Pre-download All Models
#    Eliminates cold-start delays on first use.
#    Downloads: WhisperX large-v3, wav2vec2 alignment,
#               XTTS-v2, F5-TTS MLX, openai-whisper base
# ──────────────────────────────────────────────
echo ""
echo "🤖 [3/4] Pre-downloading AI models (this may take a while on first run)..."
echo "   Models will be cached — this only runs once."
python preload_models.py

cd ..

# ──────────────────────────────────────────────
# 4. Frontend Environment
# ──────────────────────────────────────────────
echo ""
echo "⚛️  [4/4] Setting up React frontend..."
cd frontend
npm install
cd ..

# ──────────────────────────────────────────────
# Done
# ──────────────────────────────────────────────
echo ""
echo "✅ Setup complete! All models cached. Zero cold-start on first launch."
echo ""
echo "   Start with:  ./start.sh"
echo "   Or manually:"
echo "     Terminal 1: cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "     Terminal 2: cd frontend && npm run dev"
echo ""
