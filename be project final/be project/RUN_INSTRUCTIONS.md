# How to Run the Advanced Frontend

## ✅ Backend is Running!

The FastAPI backend is already running on `http://localhost:8000`

## 🚀 Quick Start

### Option 1: Use Batch Files (Easiest)

**Start Backend:**
```bash
start_backend.bat
```

**Start Frontend:**
```bash
start_frontend.bat
```

**Or start both:**
```bash
start_all.bat
```

### Option 2: Manual Start

#### 1. Start Backend (Terminal 1)
```bash
cd backend
python api.py
# Or use uvicorn directly:
uvicorn api:app --reload --port 8000
```

Backend will run on: `http://localhost:8000`

#### 2. Start Frontend (Terminal 2)
```bash
cd frontend

# First time: Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on: `http://localhost:3000`

## 📊 Access the Application

1. **Backend API**: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Status: http://localhost:8000/api/status

2. **Frontend Dashboard**: http://localhost:3000
   - Open in your browser
   - Modern React interface
   - Real-time updates

## ✅ Verify Backend is Running

The backend is already running! You can verify by:
- Opening http://localhost:8000/docs in your browser
- Or checking http://localhost:8000/api/status

## 🎯 Next Steps

1. **Install Frontend Dependencies** (if not done):
   ```bash
   cd frontend
   npm install
   ```

2. **Start Frontend**:
   ```bash
   npm run dev
   ```

3. **Open Browser**: http://localhost:3000

## 🐛 Troubleshooting

### Backend not starting?
- Check if port 8000 is already in use
- Make sure FastAPI is installed: `pip install fastapi uvicorn`

### Frontend not starting?
- Make sure Node.js is installed (version 18+)
- Run `npm install` in the frontend directory
- Check if port 3000 is available

### API not responding?
- Check backend logs for errors
- Verify backend is running on port 8000
- Check CORS settings in `backend/api.py`

---

**The backend is already running! Just start the frontend now!** 🚀

