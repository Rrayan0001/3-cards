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
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
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


