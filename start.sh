#!/bin/bash

echo "🌟 Starting Aura Voice Studio..."

# Function to handle script termination
cleanup() {
    echo "🛑 Shutting down servers..."
    if [ -n "$BACKEND_PID" ]; then kill $BACKEND_PID 2>/dev/null; fi
    if [ -n "$FRONTEND_PID" ]; then kill $FRONTEND_PID 2>/dev/null; fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# ──────────────────────────────────────────────
# Resolve venv Python / uvicorn path
# Supports both uv (.venv) and standard venv setups
# ──────────────────────────────────────────────
BACKEND_DIR="$(pwd)/backend"

if [ -f "$BACKEND_DIR/.venv/bin/uvicorn" ]; then
    UVICORN="$BACKEND_DIR/.venv/bin/uvicorn"
    PYTHON="$BACKEND_DIR/.venv/bin/python"
    echo "🐍 Using venv: $BACKEND_DIR/.venv"
elif [ -f "$BACKEND_DIR/venv/bin/uvicorn" ]; then
    UVICORN="$BACKEND_DIR/venv/bin/uvicorn"
    PYTHON="$BACKEND_DIR/venv/bin/python"
    echo "🐍 Using venv: $BACKEND_DIR/venv"
else
    echo "❌ No virtual environment found in backend/.venv or backend/venv"
    echo "   Run ./setup.sh first to create the environment."
    exit 1
fi

# ──────────────────────────────────────────────
# Backend
# Using explicit venv uvicorn path — more reliable than
# `source activate` which doesn't propagate into background processes
# ──────────────────────────────────────────────
echo "🚀 Starting backend server..."
cd "$BACKEND_DIR" || exit 1
"$UVICORN" main:app --reload --port 8000 &
BACKEND_PID=$!
cd - > /dev/null

# ──────────────────────────────────────────────
# Frontend
# ──────────────────────────────────────────────
echo "⚛️  Starting frontend server..."
cd frontend || exit 1
npm run dev &
FRONTEND_PID=$!
cd - > /dev/null

echo ""
echo "✅ Both servers are running!"
echo "   📡 Backend:  http://localhost:8000"
echo "   🌐 Frontend: http://localhost:5173"
echo "   Press Ctrl+C to stop both servers."
echo ""

wait $BACKEND_PID $FRONTEND_PID
