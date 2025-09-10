#!/bin/bash

# Video Learning Platform Production Startup Script
echo "🚀 Starting Video Learning Platform in Production Mode..."

# Build frontend if dist doesn't exist
if [ ! -d "frontend/chinese-learning-platform/dist" ]; then
    echo "📦 Building frontend for production..."
    cd frontend/chinese-learning-platform
    npm run build
    cd ../../
fi

# Set production environment
export NODE_ENV=production

# Start backend server (which will serve the built frontend)
echo "🔧 Starting Production Server (Port 5000)..."
cd backend
npm start

echo "🎉 Production server is now running!"
echo "👉 Application: http://localhost:5000"
echo "👉 API: http://localhost:5000/api"
