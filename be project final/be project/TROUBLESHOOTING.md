# Troubleshooting Guide

## Issue: "Ecosystem not initialized. Please check backend connection"

### Quick Fixes

1. **Check if backend is running:**
   ```bash
   # Check if port 8000 is in use
   netstat -ano | findstr :8000
   ```

2. **Restart the backend:**
   ```bash
   cd backend
   python api.py
   # Or
   uvicorn api:app --reload --port 8000
   ```

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

4. **Verify API URL:**
   - Frontend should connect to: `http://localhost:8000`
   - Check `frontend/src/services/api.js` for correct URL

### Common Issues

#### Backend not responding
- **Solution**: Restart backend server
- Check if port 8000 is available
- Verify FastAPI is installed: `pip install fastapi uvicorn`

#### CORS errors
- **Solution**: Backend already has CORS enabled
- Check browser console for CORS errors
- Verify backend is running on port 8000

#### Initialization timeout
- **Solution**: Initialization may take time (fetching data)
- Check backend logs for errors
- Try refreshing the page

#### Network errors
- **Solution**: 
  - Check if backend is running
  - Verify firewall isn't blocking port 8000
  - Check if frontend is on port 3000

### Manual Testing

1. **Test backend directly:**
   ```bash
   # Test root endpoint
   curl http://localhost:8000/
   
   # Test status endpoint
   curl http://localhost:8000/api/status
   
   # Test initialization
   curl -X POST http://localhost:8000/api/initialize \
     -H "Content-Type: application/json" \
     -d '{"symbols": ["AAPL", "TSLA"], "initial_capital": 100000}'
   ```

2. **Check backend logs:**
   - Look for error messages
   - Check if ecosystem is being created
   - Verify data fetching is working

3. **Check frontend console:**
   - Open browser DevTools (F12)
   - Look for API errors
   - Check network requests

### Step-by-Step Fix

1. **Stop all running servers**
2. **Start backend first:**
   ```bash
   cd backend
   python api.py
   ```
3. **Wait for backend to start** (check for "Application startup complete")
4. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
5. **Open browser:** http://localhost:3000
6. **Check browser console** for any errors

### Still Not Working?

1. **Check Python version:** Should be 3.8+
2. **Check Node.js version:** Should be 18+
3. **Reinstall dependencies:**
   ```bash
   # Backend
   pip install -r requirements.txt
   
   # Frontend
   cd frontend
   npm install
   ```
4. **Clear browser cache** and refresh
5. **Check firewall/antivirus** isn't blocking ports

---

**If issues persist, check the backend logs for detailed error messages.**

