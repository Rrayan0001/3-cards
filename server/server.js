require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Import services/handlers
const { GameService } = require('./src/services/GameService');
const { SocketHandler } = require('./src/socket/SocketHandler');

const app = express();
const server = http.createServer(app);

// CORS configuration for both Express and Socket.IO
const corsOptions = {
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'https://3-cards-kappa.vercel.app', // Production frontend
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const io = socketIo(server, {
  cors: {
    origin: corsOptions.origin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors(corsOptions));
app.use(express.json());

// Supabase is initialized in the data layer (no connection needed here)

// Initialize services
const gameService = new GameService();
// eslint-disable-next-line no-new
new SocketHandler(io, gameService);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await gameService.getGameStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🎮 3-Cards Server running on port ${PORT}`);
});


