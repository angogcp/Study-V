#!/bin/bash

# Video Learning Platform Development Startup Script
echo "🚀 Starting Video Learning Platform in Development Mode..."

# Function to handle cleanup
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Check if ports are already in use
if lsof -i :5000 >/dev/null 2>&1; then
    echo "⚠️  Port 5000 is already in use. Please stop the existing process and try again."
    exit 1
fi

if lsof -i :5173 >/dev/null 2>&1; then
    echo "⚠️  Port 5173 is already in use. Please stop the existing process and try again."
    exit 1
fi

echo "📁 Starting from directory: $(pwd)"

# Start backend server
echo "🔧 Starting Backend Server (Port 5000)..."
cd backend
npm start &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Check if backend started successfully
if curl -s http://localhost:5000/api/health >/dev/null; then
    echo "✅ Backend server is running on http://localhost:5000"
    echo "🏥 Health check: http://localhost:5000/api/health"
else
    echo "❌ Backend server failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend server
echo "🌐 Starting Frontend Server (Port 5173)..."
cd ../frontend/chinese-learning-platform
npm run dev &
FRONTEND_PID=$!

echo "⏳ Waiting for frontend to initialize..."
sleep 10

echo ""
echo "🎉 Both servers are now running!"
echo "👉 Frontend: http://localhost:5173"
echo "👉 Backend API: http://localhost:5000/api"
echo "👉 Health Check: http://localhost:5000/api/health"
echo ""
echo "Default admin credentials:"
echo "📧 Email: admin@example.com"
echo "🔑 Password: admin123"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for processes
wait
