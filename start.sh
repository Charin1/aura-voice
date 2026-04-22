#!/bin/bash

echo "🌟 Starting Aura Voice Studio..."

# Function to handle script termination
cleanup() {
    echo "🛑 Shutting down servers..."
    if [ -n "$BACKEND_PID" ]; then kill $BACKEND_PID 2>/dev/null; fi
    if [ -n "$FRONTEND_PID" ]; then kill $FRONTEND_PID 2>/dev/null; fi
    exit 0
}

# Trap SIGINT and SIGTERM to run the cleanup function
trap cleanup SIGINT SIGTERM

echo "🚀 Starting backend server..."
cd backend || exit
# Source virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

echo "⚛️ Starting frontend server..."
cd frontend || exit
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Both servers are running!"
echo "📡 Backend: http://localhost:8000"
echo "🌐 Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."

# Wait for background processes to prevent the script from exiting immediately
wait $BACKEND_PID $FRONTEND_PID
