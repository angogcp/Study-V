# 🖥️ Local Development Setup Guide

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Step-by-Step Installation](#step-by-step-installation)
- [Configuration](#configuration)
- [Starting the Application](#starting-the-application)
- [Accessing the Application](#accessing-the-application)
- [Default Credentials](#default-credentials)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [API Testing](#api-testing)
- [Troubleshooting](#troubleshooting)
- [Advanced Setup](#advanced-setup)

---

## 🔧 Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software
- **Node.js** (version 18.0.0 or higher)
  - Download from: https://nodejs.org/
  - Verify installation: `node --version`
  
- **npm** (usually comes with Node.js)
  - Verify installation: `npm --version`
  
- **pnpm** (preferred package manager for frontend)
  - Install globally: `npm install -g pnpm`
  - Verify installation: `pnpm --version`

### System Requirements
- **Operating System**: Windows 10/11, macOS 10.14+, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: At least 1GB free space
- **Browser**: Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### Optional Tools
- **Git** (for version control)
- **VS Code** (recommended IDE with extensions):
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - TypeScript and JavaScript Language Features

---

## ⚡ Quick Start

If you want to get up and running immediately:

```bash
# 1. Navigate to the project directory
cd video-learning-platform

# 2. Start both servers automatically
bash start-dev.sh
```

**That's it!** The application will be available at:
- 🌐 **Frontend**: http://localhost:5173
- 🔧 **Backend API**: http://localhost:5000/api
- 🏥 **Health Check**: http://localhost:5000/api/health

Default login credentials:
- **Email**: admin@example.com
- **Password**: admin123

---

## 📖 Step-by-Step Installation

### Step 1: Verify Prerequisites

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Check pnpm version (install if missing)
pnpm --version || npm install -g pnpm
```

### Step 2: Navigate to Project Directory

```bash
cd video-learning-platform
```

### Step 3: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already installed)
npm install

# Verify installation
ls node_modules | head -5
```

### Step 4: Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend/chinese-learning-platform

# Install dependencies (if not already installed)
pnpm install

# Verify installation
ls node_modules | head -5
```

### Step 5: Environment Configuration

The project includes pre-configured environment files:

**Backend (.env)**:
```env
NODE_ENV=development
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DB_PATH=./learning_platform.db
MAX_FILE_SIZE=10485760
```

**Frontend (.env)**:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Step 6: Database Initialization

The database will be automatically created when you first start the backend server. It includes:
- User profiles table
- Video resources with pre-loaded content
- Learning progress tracking
- Notes system
- Default admin account

---

## ⚙️ Configuration

### Backend Configuration Options

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |
| `JWT_SECRET` | JWT token secret | (provided) |
| `DB_PATH` | SQLite database path | ./learning_platform.db |
| `MAX_FILE_SIZE` | Maximum upload size | 10MB |

### Frontend Configuration Options

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `VITE_API_BASE_URL` | Backend API endpoint | http://localhost:5000/api |

### CORS Configuration

The backend is pre-configured to allow requests from:
- http://localhost:3000
- http://localhost:5173
- http://127.0.0.1:3000
- http://127.0.0.1:5173

---

## 🚀 Starting the Application

### Option 1: Automated Startup (Recommended)

```bash
# From project root directory
bash start-dev.sh
```

This script will:
1. Check if ports are available
2. Start the backend server (port 5000)
3. Wait for backend to initialize
4. Start the frontend development server (port 5173)
5. Provide you with access URLs

### Option 2: Manual Startup

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend/chinese-learning-platform
pnpm dev
```

### Option 3: Production Mode

```bash
# Build and serve in production mode
bash start-prod.sh
```

---

## 🌐 Accessing the Application

Once both servers are running:

### Main Application URLs
- **🏠 Homepage**: http://localhost:5173
- **🔐 Login Page**: http://localhost:5173/login
- **📚 Learning Dashboard**: http://localhost:5173/dashboard

### API Endpoints
- **🏥 Health Check**: http://localhost:5000/api/health
- **🔑 Authentication**: http://localhost:5000/api/auth/*
- **🎥 Videos**: http://localhost:5000/api/videos
- **📊 Progress**: http://localhost:5000/api/progress
- **📝 Notes**: http://localhost:5000/api/notes

### Admin Features
- **📹 Video Management**: Available after logging in as admin
- **👥 User Management**: View user statistics and progress
- **📈 Analytics Dashboard**: Learning metrics and insights

---

## 🔑 Default Credentials

### Administrator Account
- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Role**: Administrator
- **Permissions**: Full access to all features

### Test Student Accounts
You can create student accounts through the registration page:
1. Visit http://localhost:5173/register
2. Fill in student information
3. Select grade level (初中1, 初中2, or 初中3)
4. Choose subjects of interest

---

## 📁 Project Structure

```
video-learning-platform/
├── 📄 LOCAL_SETUP.md          # This guide
├── 📄 README.md               # Project overview
├── 📄 TROUBLESHOOTING.md      # Troubleshooting guide
├── 📄 start-dev.sh            # Development startup script
├── 📄 start-prod.sh           # Production startup script
│
├── 📁 backend/                # Node.js/Express backend
│   ├── 📄 server.js           # Main server file
│   ├── 📄 package.json        # Backend dependencies
│   ├── 📄 .env                # Backend configuration
│   ├── 📄 learning_platform.db # SQLite database
│   ├── 📁 database/           # Database setup and models
│   │   ├── init.js            # Database initialization
│   │   └── connection.js      # Database connection
│   ├── 📁 routes/             # API route handlers
│   │   ├── auth.js            # Authentication routes
│   │   ├── videos.js          # Video management
│   │   ├── subjects.js        # Subject categories
│   │   ├── progress.js        # Learning progress
│   │   └── notes.js           # Note management
│   ├── 📁 middleware/         # Express middleware
│   └── 📁 scripts/            # Utility scripts
│
└── 📁 frontend/               # React frontend
    └── chinese-learning-platform/
        ├── 📄 package.json    # Frontend dependencies
        ├── 📄 .env            # Frontend configuration
        ├── 📄 vite.config.ts  # Vite build configuration
        ├── 📄 tailwind.config.js # Tailwind CSS config
        ├── 📁 src/            # Source code
        │   ├── 📄 App.tsx     # Main React component
        │   ├── 📄 main.tsx    # Application entry point
        │   ├── 📁 components/ # React components
        │   ├── 📁 contexts/   # React contexts
        │   ├── 📁 services/   # API service functions
        │   ├── 📁 types/      # TypeScript type definitions
        │   └── 📁 lib/        # Utility functions
        └── 📁 dist/           # Built files (production)
```

---

## 🔄 Development Workflow

### Making Code Changes

1. **Backend Changes**:
   - Edit files in `backend/` directory
   - Server automatically restarts (if using nodemon)
   - Check console for any errors

2. **Frontend Changes**:
   - Edit files in `frontend/chinese-learning-platform/src/`
   - Vite hot-reload will update the browser automatically
   - Check browser console for any errors

### Adding New Features

1. **New API Endpoints**:
   - Add routes in `backend/routes/`
   - Update database schema if needed
   - Test with curl or Postman

2. **New Frontend Components**:
   - Add components in `src/components/`
   - Create types in `src/types/`
   - Add API services in `src/services/`

### Database Changes

```bash
# Reset database (will lose all data)
cd backend
rm learning_platform.db
npm start  # Database will be recreated

# Add sample data
npm run seed
```

---

## 🧪 API Testing

### Using curl

```bash
# Health check
curl http://localhost:5000/api/health

# Login test
curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"admin123"}'

# Get videos (with authentication token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/videos
```

### Using Browser Developer Tools

1. Open http://localhost:5173
2. Open Developer Tools (F12)
3. Go to Network tab
4. Perform actions in the app
5. View API requests and responses

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### ❌ CORS Errors
**Problem**: "Access to fetch at 'http://localhost:5000' from origin 'http://localhost:5173' has been blocked by CORS policy"

**Solutions**:
```bash
# 1. Verify backend is running
curl http://localhost:5000/api/health

# 2. Check CORS preflight
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS http://localhost:5000/api/health

# 3. Clear browser cache and cookies
# 4. Restart both servers
```

#### ❌ Port Already in Use
**Problem**: "Error: listen EADDRINUSE: address already in use :::5000"

**Solutions**:
```bash
# Find process using the port
lsof -i :5000
lsof -i :5173

# Kill the process
kill -9 $(lsof -t -i:5000)  # Backend
kill -9 $(lsof -t -i:5173)  # Frontend

# Or kill all Node processes
killall node
```

#### ❌ Database Issues
**Problem**: Database errors or missing tables

**Solutions**:
```bash
# Reset database
cd backend
rm learning_platform.db
npm start  # Database will be recreated with sample data
```

#### ❌ Frontend Build Errors
**Problem**: Vite or TypeScript compilation errors

**Solutions**:
```bash
cd frontend/chinese-learning-platform

# Clear cache
rm -rf node_modules/.vite

# Reinstall dependencies
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# Check TypeScript
pnpm run build
```

#### ❌ Environment Variables Not Loading
**Problem**: Configuration not being loaded

**Solutions**:
```bash
# Check .env files exist
ls -la backend/.env
ls -la frontend/chinese-learning-platform/.env

# Verify content
cat backend/.env
cat frontend/chinese-learning-platform/.env

# Restart servers after changes
```

### Debug Mode

**Backend Debug Mode**:
```bash
cd backend
DEBUG=* npm start  # Verbose logging
```

**Frontend Debug Mode**:
```bash
cd frontend/chinese-learning-platform
VITE_DEBUG=true pnpm dev
```

### Log Files

**Backend Logs**:
- Console output shows all server activity
- Database operations are logged
- API requests and responses are logged

**Frontend Logs**:
- Browser Developer Console
- Network tab for API requests
- Vite build logs in terminal

---

## 🔒 Security Considerations

### Development Security
- JWT tokens are used for authentication
- Passwords are hashed with bcrypt
- CORS is properly configured
- Input validation is implemented

### Production Security
- Change JWT_SECRET in production
- Use HTTPS in production
- Set proper CORS origins
- Enable rate limiting
- Regular security updates

---

## 📚 Learning Resources

### Technologies Used
- **Backend**: [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/), [SQLite](https://sqlite.org/)
- **Frontend**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Authentication**: [JSON Web Tokens (JWT)](https://jwt.io/)

### Useful Documentation
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [React Documentation](https://react.dev/learn)
- [Vite Documentation](https://vitejs.dev/guide/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## 📞 Getting Help

### Before Asking for Help

1. **Check this guide** for common solutions
2. **Read TROUBLESHOOTING.md** for specific issues
3. **Check console logs** for error messages
4. **Verify prerequisites** are installed correctly
5. **Try restarting** both servers

### What to Include When Reporting Issues

- Your operating system and version
- Node.js and npm versions
- Exact error messages from console
- Steps to reproduce the problem
- Screenshots if relevant

### Self-Help Checklist

- [ ] Prerequisites installed correctly
- [ ] Project dependencies installed
- [ ] Environment files exist and are correct
- [ ] Ports 5000 and 5173 are available
- [ ] Backend server starts without errors
- [ ] Frontend development server starts
- [ ] Browser can access http://localhost:5173
- [ ] API health check returns OK

---

## 🎉 Success! You're Ready to Develop

If you can:
- ✅ Access http://localhost:5173
- ✅ Log in with admin@example.com / admin123
- ✅ See the learning dashboard
- ✅ Navigate through different sections

**Congratulations!** Your local development environment is set up correctly.

### Next Steps
1. Explore the application features
2. Try creating a student account
3. Browse the pre-loaded mathematics videos
4. Test the note-taking functionality
5. Check out the learning progress tracking

### Happy Coding! 🚀

---

*Last updated: September 9, 2025*  
*Version: 1.0.0*