# Video Learning Platform - Server Setup & Troubleshooting Guide

## 🚀 Quick Start

### Option 1: Using Startup Scripts (Recommended)

**Development Mode (Frontend + Backend):**
```bash
cd video-learning-platform
bash start-dev.sh
```

**Production Mode:**
```bash
cd video-learning-platform
bash start-prod.sh
```

### Option 2: Manual Setup

**Backend Server:**
```bash
cd backend
npm install  # Only needed first time
npm start    # For production
# OR
npm run dev  # For development with nodemon
```

**Frontend Server (Development):**
```bash
cd frontend/chinese-learning-platform
npm install  # Only needed first time
npm run dev
```

## 🌐 Server URLs

- **Frontend (Development)**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health
- **Production**: http://localhost:5000 (serves both frontend and API)

## 👤 Default Credentials

- **Email**: admin@example.com
- **Password**: admin123

## 🔧 Configuration Files

### Backend Configuration (.env)
```env
NODE_ENV=development
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DB_PATH=./database/learning_platform.db
MAX_FILE_SIZE=10485760
```

### Frontend Configuration (.env)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## 🛠️ Troubleshooting

### CORS Errors
✅ **CORS is properly configured** to allow:
- http://localhost:3000
- http://localhost:5173
- http://127.0.0.1:3000
- http://127.0.0.1:5173

**If you still get CORS errors:**

1. **Check if backend is running:**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Verify CORS preflight:**
   ```bash
   curl -H "Origin: http://localhost:5173" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS http://localhost:5000/api/health
   ```

3. **Check browser console** for actual error messages

### Port Already in Use

**Check what's using the ports:**
```bash
lsof -i :5000  # Backend port
lsof -i :5173  # Frontend port
```

**Kill processes on specific ports:**
```bash
kill -9 $(lsof -t -i:5000)  # Kill backend
kill -9 $(lsof -t -i:5173)  # Kill frontend
```

### Database Issues

**Reset database:**
```bash
cd backend
rm learning_platform.db
npm start  # Will recreate database with default admin
```

**Seed sample data:**
```bash
cd backend
npm run seed
```

### Frontend Build Issues

**Clear cache and reinstall:**
```bash
cd frontend/chinese-learning-platform
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

**Clear Vite cache:**
```bash
rm -rf node_modules/.vite
```

### Backend Startup Issues

**Check logs:**
```bash
cd backend
npm start  # Look for error messages
```

**Common issues:**
1. **Missing dependencies**: Run `npm install`
2. **Database permissions**: Ensure write permissions in backend directory
3. **Port conflicts**: Another service using port 5000

## 📁 Project Structure

```
video-learning-platform/
├── backend/
│   ├── server.js              # Main server file
│   ├── .env                   # Backend configuration
│   ├── database/              # Database setup
│   ├── routes/                # API routes
│   └── middleware/            # Auth middleware
├── frontend/
│   └── chinese-learning-platform/
│       ├── .env              # Frontend configuration
│       ├── src/
│       │   ├── services/     # API services
│       │   └── lib/api.ts    # Axios configuration
│       └── dist/            # Built frontend (production)
├── start-dev.sh             # Development startup script
└── start-prod.sh            # Production startup script
```

## 🔍 Debugging Commands

**Test API endpoints:**
```bash
# Health check
curl http://localhost:5000/api/health

# Login test
curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"admin123"}'
```

**Check running processes:**
```bash
ps aux | grep node
ps aux | grep npm
```

**Monitor server logs:**
```bash
# If running in background
tail -f backend/backend.log

# Or run in foreground for real-time logs
cd backend && npm start
```

## 🚨 Emergency Reset

If everything fails, here's how to completely reset:

```bash
# Stop all processes
killall node
killall npm

# Reset backend
cd backend
rm -rf node_modules
rm learning_platform.db
npm install
npm start

# Reset frontend (in new terminal)
cd frontend/chinese-learning-platform
rm -rf node_modules
rm -rf dist
rm pnpm-lock.yaml
pnpm install
npm run dev
```

## ✅ Success Indicators

**Backend is working when:**
- Console shows: "🚀 Server is running on port 5000"
- Health check returns JSON: `{"status":"OK",...}`
- No error messages in console

**Frontend is working when:**
- Console shows: "Local: http://localhost:5173/"
- Browser loads the application without CORS errors
- Network requests in DevTools show successful API calls

**CORS is working when:**
- No "CORS request did not succeed" errors
- API calls return data instead of network errors
- OPTIONS requests return successfully
