const Game = require('../models/Game');
const User = require('../models/User');
const { createDeck, shuffleDeck, calculateScore, getPowerCardEffect } = require('../../../shared/gameLogic');
const { v4: uuidv4 } = require('uuid');

class GameService {
  constructor() {
    this.activeGames = new Map();
    this.turnTimers = new Map();
  }

  async createGame(hostId, hostUsername, roomCode) {
    const gameId = uuidv4();
    const deck = this.createGameDeck(1);

    const gameData = {
      gameId,
      roomCode,
      players: [
        {
          id: hostId,
          username: hostUsername,
          cards: ['hidden', 'hidden', 'hidden'],
          score: 0,
          isActive: true,
          hasInitialPeek: false
        }
      ],
      deck: shuffleDeck(deck),
      discardPile: [],
      currentTurn: hostId,
      status: 'waiting'
    };

    const game = new Game(gameData);
    await game.save();
    this.activeGames.set(gameId, gameData);

    return gameData;
  }

  async joinGame(gameId, playerId, playerUsername) {
    const game = await Game.findOne({ gameId });
    if (!game) throw new Error('Game not found');
    if (game.status !== 'waiting') throw new Error('Game already started');
    if (game.players.length >= 6) throw new Error('Game is full');

    const newPlayer = {
      id: playerId,
      username: playerUsername,
      cards: ['hidden', 'hidden', 'hidden'],
      score: 0,
      isActive: true,
      hasInitialPeek: false
    };

    game.players.push(newPlayer);
    await game.save();

    const gameData = this.activeGames.get(gameId) || game.toObject();
    gameData.players = game.players;
    this.activeGames.set(gameId, gameData);

    return gameData;
  }

  async startGame(gameId) {
    const game = await Game.findOne({ gameId });
    if (!game) throw new Error('Game not found');
    if (game.players.length < 2) throw new Error('Need at least 2 players');

    const playerCount = game.players.length;
    const deckCount = playerCount <= 4 ? 1 : 2;
    const deck = shuffleDeck(this.createGameDeck(deckCount));

    game.players.forEach((player) => {
      player.cards = [deck.pop(), deck.pop(), deck.pop()];
    });

    game.deck = deck;
    game.status = 'in_progress';
    game.currentTurn = game.players[0].id;

    await game.save();

    this.activeGames.set(gameId, game.toObject());

    return game.toObject();
  }

  async performInitialPeek(gameId, playerId, cardIndex) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData) throw new Error('Game not found');

    const player = gameData.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Player not found');
    if (player.hasInitialPeek) throw new Error('Already peeked');

    player.hasInitialPeek = true;

    await Game.updateOne(
      { gameId, 'players.id': playerId },
      { $set: { 'players.$.hasInitialPeek': true } }
    );

    return {
      cardValue: player.cards[cardIndex],
      cardIndex
    };
  }

  async drawCard(gameId, playerId) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData) throw new Error('Game not found');
    if (gameData.currentTurn !== playerId) throw new Error('Not your turn');
    if (gameData.deck.length === 0) throw new Error('Deck is empty');

    const drawnCard = gameData.deck.pop();

    this.clearTurnTimer(gameId);

    return {
      card: drawnCard,
      isPowerCard: this.isPowerCard(drawnCard),
      effect: getPowerCardEffect(drawnCard)
    };
  }

  async processPowerCard(gameId, playerId, powerCard, targetData) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData) throw new Error('Game not found');

    const player = gameData.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const cardType = powerCard.charAt(0);
    let result = {};

    switch (cardType) {
      case 'K': {
        const { cardIndex } = targetData;
        result = { type: 'peek_own', cardValue: player.cards[cardIndex], cardIndex };
        break;
      }
      case 'J': {
        const targetPlayer = gameData.players.find((p) => p.id === targetData.targetPlayerId);
        if (!targetPlayer) throw new Error('Target player not found');
        result = {
          type: 'peek_opponent',
          cardValue: targetPlayer.cards[targetData.cardIndex],
          cardIndex: targetData.cardIndex,
          targetPlayerId: targetData.targetPlayerId
        };
        break;
      }
      case 'Q': {
        const swapTarget = gameData.players.find((p) => p.id === targetData.targetPlayerId);
        if (!swapTarget) throw new Error('Target player not found');
        const playerCard = player.cards[targetData.playerCardIndex];
        const targetCard = swapTarget.cards[targetData.targetCardIndex];
        player.cards[targetData.playerCardIndex] = targetCard;
        swapTarget.cards[targetData.targetCardIndex] = playerCard;
        result = {
          type: 'swap',
          playerCardIndex: targetData.playerCardIndex,
          targetCardIndex: targetData.targetCardIndex,
          targetPlayerId: targetData.targetPlayerId
        };
        break;
      }
      case '7': {
        const shuffleTarget = gameData.players.find((p) => p.id === targetData.targetPlayerId);
        if (!shuffleTarget) throw new Error('Target player not found');
        for (let i = shuffleTarget.cards.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffleTarget.cards[i], shuffleTarget.cards[j]] = [
            shuffleTarget.cards[j],
            shuffleTarget.cards[i]
          ];
        }
        result = { type: 'shuffle', targetPlayerId: targetData.targetPlayerId };
        break;
      }
      default:
        break;
    }

    await this.updateGameInDatabase(gameId, gameData);

    return result;
  }

  async makeMove(gameId, playerId, action, cardIndex = null, drawnCardParam = null) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData) throw new Error('Game not found');
    if (gameData.currentTurn !== playerId) throw new Error('Not your turn');

    const player = gameData.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Player not found');

    if (action === 'discard') {
      const drawnCard = drawnCardParam;
      if (!drawnCard) throw new Error('No drawn card');
      gameData.discardPile.push(drawnCard);
    } else if (action === 'swap' && cardIndex !== null) {
      const drawnCard = drawnCardParam;
      if (!drawnCard) throw new Error('No drawn card');
      const oldCard = player.cards[cardIndex];
      player.cards[cardIndex] = drawnCard;
      gameData.discardPile.push(oldCard);
    }

    this.nextTurn(gameData);

    if (gameData.deck.length === 0) {
      await this.endGame(gameId);
      return { gameEnded: true };
    }

    this.startTurnTimer(gameId, gameData.currentTurn);

    await this.updateGameInDatabase(gameId, gameData);

    return { gameEnded: false };
  }

  async endGame(gameId) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData) throw new Error('Game not found');

    gameData.players.forEach((player) => {
      player.score = calculateScore(player.cards);
    });

    const sortedPlayers = [...gameData.players].sort((a, b) => a.score - b.score);
    const winner = sortedPlayers[0];

    gameData.status = 'ended';
    gameData.winner = winner.id;

    for (const player of gameData.players) {
      // eslint-disable-next-line no-await-in-loop
      await this.updatePlayerStats(player.id, player.id === winner.id, player.score);
    }

    this.clearTurnTimer(gameId);

    await this.updateGameInDatabase(gameId, gameData);

    return {
      winner,
      finalScores: sortedPlayers,
      gameData
    };
  }

  // Helpers
  createGameDeck(deckCount = 1) {
    const decks = [];
    for (let i = 0; i < deckCount; i += 1) {
      decks.push(...createDeck());
    }
    return decks;
  }

  isPowerCard(card) {
    const rank = card.charAt(0);
    return ['K', 'Q', 'J', '7'].includes(rank);
    }

  nextTurn(gameData) {
    const currentIndex = gameData.players.findIndex((p) => p.id === gameData.currentTurn);
    const nextIndex = (currentIndex + 1) % gameData.players.length;
    gameData.currentTurn = gameData.players[nextIndex].id;
  }

  startTurnTimer(gameId, playerId) {
    this.clearTurnTimer(gameId);
    const timer = setTimeout(() => {
      this.handleTurnTimeout(gameId, playerId);
    }, 45000);
    this.turnTimers.set(gameId, timer);
  }

  clearTurnTimer(gameId) {
    const timer = this.turnTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.turnTimers.delete(gameId);
    }
  }

  async handleTurnTimeout(gameId, playerId) {
    try {
      const gameData = this.activeGames.get(gameId);
      if (gameData && gameData.currentTurn === playerId) {
        this.nextTurn(gameData);
        await this.updateGameInDatabase(gameId, gameData);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Turn timeout error:', error);
    }
  }

  async updateGameInDatabase(gameId, gameData) {
    await Game.findOneAndUpdate({ gameId }, gameData, { new: true });
  }

  async updatePlayerStats(playerId, won, score) {
    const user = await User.findOne({ userId: playerId });
    if (user) {
      user.stats.gamesPlayed += 1;
      if (won) user.stats.wins += 1;
      else user.stats.losses += 1;
      user.stats.averageScore =
        (user.stats.averageScore * (user.stats.gamesPlayed - 1) + score) /
        user.stats.gamesPlayed;
      await user.save();
    }
  }

  async getGameStats() {
    const totalGames = await Game.countDocuments({ status: 'ended' });
    const activeGames = await Game.countDocuments({ status: 'in_progress' });
    const totalUsers = await User.countDocuments();
    return {
      totalGames,
      activeGames,
      totalUsers,
      averageGameLength: '8 minutes'
    };
  }
}

module.exports = { GameService };


