const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  id: { type: String, required: true },
  username: { type: String, required: true },
  cards: [{ type: String }],
  score: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  hasInitialPeek: { type: Boolean, default: false }
});

const GameSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true, unique: true },
    roomCode: { type: String, required: true },
    players: [PlayerSchema],
    deck: [{ type: String }],
    discardPile: [{ type: String }],
    currentTurn: { type: String },
    status: {
      type: String,
      enum: ['waiting', 'starting', 'in_progress', 'ended'],
      default: 'waiting'
    },
    winner: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    maxPlayers: { type: Number, default: 6 },
    turnTimeLimit: { type: Number, default: 45000 }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Game', GameSchema);


