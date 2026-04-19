#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Trading Signal Dashboard ==="
echo ""

# Backend setup
echo ">>> Setting up Python backend..."
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ">>> Created .env from template. Edit backend/.env to add your Telegram & cTrader credentials."
fi

# Start backend in background
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo ">>> Backend started (PID $BACKEND_PID) at http://localhost:8000"

# Frontend setup
echo ""
echo ">>> Setting up React frontend..."
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  npm install
fi

# Start frontend
npm run dev &
FRONTEND_PID=$!
echo ">>> Frontend started (PID $FRONTEND_PID) at http://localhost:3000"

echo ""
echo "=== Dashboard ready at http://localhost:3000 ==="
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
