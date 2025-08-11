require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
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

// MongoDB Connection (non-fatal if unavailable)
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/3cards';
mongoose
  .connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('MongoDB connected');
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection failed:', err.message);
  });

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


