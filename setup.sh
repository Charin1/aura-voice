#!/bin/bash

# Aura Voice Setup Script
echo "🌟 Initializing Aura Voice Studio..."

# 1. Install System Dependencies via Homebrew
echo "📦 Checking system dependencies..."
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found. Please install it from https://brew.sh/"
    exit 1
fi

echo "Installing ffmpeg and espeak..."
brew install ffmpeg espeak

# 2. Setup Backend Environment
echo "🐍 Setting up Python environment..."
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
cd ..

# 3. Setup Frontend Environment
echo "⚛️ Setting up React frontend..."
cd frontend
npm install
cd ..

echo "✅ Setup complete! You can now start the studio."
echo "Terminal 1: cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "Terminal 2: cd frontend && npm run dev"
