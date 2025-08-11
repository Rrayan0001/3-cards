const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatar: { type: String, default: '' },
    stats: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      gamesPlayed: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', UserSchema);


