# Advanced Frontend Setup Guide

## 🚀 Modern React + FastAPI Frontend

This project now uses a **modern, professional frontend** built with:
- **React 18** - Latest React with hooks
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Beautiful charts
- **Framer Motion** - Smooth animations
- **FastAPI** - Modern Python backend API

## 📦 Installation

### 1. Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the FastAPI backend
cd backend
python api.py
# Or use uvicorn directly:
uvicorn api:app --reload --port 8000
```

The backend will run on `http://localhost:8000`

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies (requires Node.js 18+)
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:3000`

## 🎨 Features

### Modern UI Components
- ✅ **Responsive Design** - Works on all screen sizes
- ✅ **Dark Theme** - Professional dark mode interface
- ✅ **Real-time Updates** - Auto-refresh functionality
- ✅ **Smooth Animations** - Framer Motion animations
- ✅ **Interactive Charts** - Recharts for data visualization
- ✅ **Toast Notifications** - User feedback with react-hot-toast

### Dashboard Features
- 📊 **Portfolio Overview** - Real-time portfolio value and holdings
- 📈 **Trading Charts** - Interactive portfolio value over time
- 🤖 **Agent Status** - Live status of all 4 agents
- 🔮 **Predictions Panel** - Current stock predictions with confidence
- 📋 **Trade History** - Recent trades table
- 📊 **Performance Metrics** - Win rate, accuracy, Sharpe ratio

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx          # Main dashboard
│   │   ├── PortfolioOverview.jsx  # Portfolio display
│   │   ├── TradingChart.jsx       # Portfolio chart
│   │   ├── AgentStatus.jsx        # Agent status cards
│   │   ├── PredictionsPanel.jsx   # Predictions display
│   │   ├── TradeHistory.jsx       # Trade history table
│   │   └── PerformanceMetrics.jsx # Performance stats
│   ├── services/
│   │   └── api.js                 # API service layer
│   ├── App.jsx                    # Main app component
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Global styles
├── package.json                   # Dependencies
├── vite.config.js                 # Vite configuration
└── tailwind.config.js             # Tailwind configuration

backend/
└── api.py                         # FastAPI backend
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:8000
```

### API Endpoints

The backend provides these REST API endpoints:

- `GET /api/status` - Ecosystem status
- `POST /api/initialize` - Initialize ecosystem
- `GET /api/predictions` - Get predictions
- `POST /api/train-models` - Train models
- `POST /api/run-cycle` - Run trading cycle
- `GET /api/portfolio` - Get portfolio
- `GET /api/performance` - Get performance metrics
- `GET /api/trade-history` - Get trade history
- `GET /api/performance-history` - Get performance history
- `GET /api/risk-alerts` - Get risk alerts
- `GET /api/agent-status` - Get agent status

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
python api.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open `http://localhost:3000` in your browser.

### Production Build

**Build frontend:**
```bash
cd frontend
npm run build
```

**Serve backend:**
```bash
cd backend
uvicorn api:app --host 0.0.0.0 --port 8000
```

## 🎯 Key Advantages Over Streamlit

1. **Performance** - Much faster, no Python overhead in UI
2. **Customization** - Full control over design and functionality
3. **Scalability** - Can handle more complex interactions
4. **Modern Stack** - Uses latest web technologies
5. **Professional Look** - Enterprise-grade UI/UX
6. **Real-time** - Better WebSocket support for live updates
7. **Mobile Responsive** - Works on all devices
8. **Animations** - Smooth, polished user experience

## 📱 Responsive Design

The frontend is fully responsive:
- **Desktop** - Full dashboard with all panels
- **Tablet** - Optimized layout
- **Mobile** - Stacked layout for small screens

## 🔄 Auto-Refresh

Enable auto-refresh in the dashboard to get real-time updates every 5 seconds.

## 🎨 Customization

### Colors
Edit `tailwind.config.js` to customize the color scheme.

### Components
All components are in `src/components/` - easily customizable.

### API
Modify `src/services/api.js` to add new API calls.

## 🐛 Troubleshooting

### Backend not connecting
- Check if backend is running on port 8000
- Verify CORS settings in `api.py`

### Frontend not loading
- Run `npm install` to install dependencies
- Check Node.js version (requires 18+)

### Charts not displaying
- Ensure Recharts is installed: `npm install recharts`
- Check browser console for errors

## 📚 Next Steps

1. Add WebSocket support for real-time updates
2. Add user authentication
3. Add more chart types
4. Add export functionality
5. Add dark/light theme toggle
6. Add notifications system

---

**Enjoy your modern, professional trading dashboard!** 🚀

