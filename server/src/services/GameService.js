const { createDeck, shuffleDeck, calculateScore, getPowerCardEffect } = require('../../../shared/gameLogic');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabaseClient');
const { ComputerPlayer } = require('../ai/ComputerPlayer');

class GameService {
  constructor() {
    this.activeGames = new Map();
    this.turnTimers = new Map();
  }

  async createGame(hostId, hostUsername, roomCode) {
    try {
      console.log(`🎮 Creating game for ${hostUsername} with room code ${roomCode}`);
      
      const gameId = uuidv4();
      const deck = this.createGameDeck(1);

      // Add timeout to the database operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database operation timed out')), 15000);
      });

      const insertPromise = supabase.from('games').insert([
        {
          game_id: gameId,
          room_code: roomCode,
          deck: shuffleDeck(deck),
          status: 'waiting',
          current_turn: hostId
        }
      ]).select();

      const { data, error } = await Promise.race([insertPromise, timeoutPromise]);

      if (error) {
        console.error('❌ Supabase insert game error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const newGame = data[0];
      console.log(`✅ Game created in database: ${gameId}`);

      // Insert player with timeout
      const playerInsertPromise = supabase.from('game_players').insert([
        {
          game_id: newGame.game_id,
          player_id: hostId,
          username: hostUsername,
          cards: ['hidden', 'hidden', 'hidden'],
          score: 0,
          is_active: true,
          has_initial_peek: false
        }
      ]);

      const { error: playerError } = await Promise.race([playerInsertPromise, timeoutPromise]);
      
      if (playerError) {
        console.error('❌ Supabase insert player error:', playerError);
        throw new Error(`Player creation error: ${playerError.message}`);
      }

      console.log(`✅ Player ${hostUsername} added to game`);

      // Fetch the full game state
      const fetchPromise = supabase
        .from('games')
        .select('*, game_players(*)')
        .eq('game_id', newGame.game_id)
        .single();

      const { data: fullGameData, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]);

      if (fetchError) {
        console.error('❌ Supabase fetch game error:', fetchError);
        throw new Error(`Game fetch error: ${fetchError.message}`);
      }

      // Map Supabase data to expected gameData structure
      const gameData = {
        gameId: fullGameData.game_id,
        roomCode: fullGameData.room_code,
        players: fullGameData.game_players.map(p => ({
          id: p.player_id,
          username: p.username,
          cards: p.cards,
          score: p.score,
          isActive: p.is_active,
          hasInitialPeek: p.has_initial_peek
        })),
        deck: fullGameData.deck,
        discardPile: fullGameData.discard_pile,
        currentTurn: fullGameData.current_turn,
        status: fullGameData.status,
        winner: fullGameData.winner
      };

      this.activeGames.set(gameId, gameData);
      console.log(`🎯 Game ${gameId} successfully created and cached`);
      return gameData;
      
    } catch (error) {
      console.error('❌ Database game creation failed, using local fallback:', error.message);
      
      // Fallback: Create game locally without database
      const gameId = uuidv4();
      const deck = shuffleDeck(this.createGameDeck(1));
      
      const gameData = {
        gameId: gameId,
        roomCode: roomCode,
        players: [{
          id: hostId,
          username: hostUsername,
          cards: ['hidden', 'hidden', 'hidden'],
          score: 0,
          isActive: true,
          hasInitialPeek: false
        }],
        deck: deck,
        discardPile: [],
        currentTurn: hostId,
        status: 'waiting',
        winner: null
      };

      this.activeGames.set(gameId, gameData);
      console.log(`🎯 Game ${gameId} created locally (database unavailable)`);
      return gameData;
    }
  }

  async createComputerGame(hostId, hostUsername, roomCode) {
    try {
      console.log(`🤖 Creating computer game for ${hostUsername} with room code ${roomCode}`);
      
      const gameId = uuidv4();
      const deck = this.createGameDeck(1);

      // Add timeout to the database operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database operation timed out')), 15000);
      });

      const insertPromise = supabase.from('games').insert([
        {
          game_id: gameId,
          room_code: roomCode,
          deck: shuffleDeck(deck),
          status: 'waiting',
          current_turn: hostId
        }
      ]).select();

      const { data, error } = await Promise.race([insertPromise, timeoutPromise]);

      if (error) {
        console.error('❌ Supabase insert game error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const newGame = data[0];
      console.log(`✅ Computer game created in database: ${gameId}`);

      // Insert human player
      const playerInsertPromise = supabase.from('game_players').insert([
        {
          game_id: newGame.game_id,
          player_id: hostId,
          username: hostUsername,
          cards: ['hidden', 'hidden', 'hidden'],
          score: 0,
          is_active: true,
          has_initial_peek: false
        }
      ]);

      const { error: playerError } = await Promise.race([playerInsertPromise, timeoutPromise]);
      
      if (playerError) {
        console.error('❌ Supabase insert player error:', playerError);
        throw new Error(`Player creation error: ${playerError.message}`);
      }

      // Insert computer player
      const computerPlayer = new ComputerPlayer('Computer');
      const computerData = computerPlayer.getPlayerData();
      
      const computerInsertPromise = supabase.from('game_players').insert([
        {
          game_id: newGame.game_id,
          player_id: computerData.id,
          username: computerData.username,
          cards: ['hidden', 'hidden', 'hidden'],
          score: 0,
          is_active: true,
          has_initial_peek: false
        }
      ]);

      const { error: computerError } = await Promise.race([computerInsertPromise, timeoutPromise]);
      
      if (computerError) {
        console.error('❌ Supabase insert computer player error:', computerError);
        throw new Error(`Computer player creation error: ${computerError.message}`);
      }

      console.log(`✅ Computer player added to game`);

      // Fetch the full game state
      const fetchPromise = supabase
        .from('games')
        .select('*, game_players(*)')
        .eq('game_id', newGame.game_id)
        .single();

      const { data: fullGameData, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]);

      if (fetchError) {
        console.error('❌ Supabase fetch game error:', fetchError);
        throw new Error(`Game fetch error: ${fetchError.message}`);
      }

      // Map Supabase data to expected gameData structure
      const gameData = {
        gameId: fullGameData.game_id,
        roomCode: fullGameData.room_code,
        players: fullGameData.game_players.map(p => ({
          id: p.player_id,
          username: p.username,
          cards: p.cards,
          score: p.score,
          isActive: p.is_active,
          hasInitialPeek: p.has_initial_peek,
          isComputer: p.player_id === computerData.id
        })),
        deck: fullGameData.deck,
        discardPile: fullGameData.discard_pile,
        currentTurn: fullGameData.current_turn,
        status: fullGameData.status,
        winner: fullGameData.winner
      };

      this.activeGames.set(gameId, gameData);
      console.log(`🎯 Computer game ${gameId} successfully created and cached`);
      return gameData;
      
    } catch (error) {
      console.error('❌ Database computer game creation failed, using local fallback:', error.message);
      
      // Fallback: Create computer game locally without database
      const gameId = uuidv4();
      const deck = shuffleDeck(this.createGameDeck(1));
      const computerPlayer = new ComputerPlayer('Computer');
      const computerData = computerPlayer.getPlayerData();
      
      const gameData = {
        gameId: gameId,
        roomCode: roomCode,
        players: [
          {
            id: hostId,
            username: hostUsername,
            cards: ['hidden', 'hidden', 'hidden'],
            score: 0,
            isActive: true,
            hasInitialPeek: false
          },
          {
            id: computerData.id,
            username: computerData.username,
            cards: ['hidden', 'hidden', 'hidden'],
            score: 0,
            isActive: true,
            hasInitialPeek: false,
            isComputer: true
          }
        ],
        deck: deck,
        discardPile: [],
        currentTurn: hostId,
        status: 'waiting',
        winner: null
      };

      this.activeGames.set(gameId, gameData);
      console.log(`🎯 Computer game ${gameId} created locally (database unavailable)`);
      return gameData;
    }
  }

  async joinGame(gameId, playerId, playerUsername) {
    const { data: gameRows, error: gErr } = await supabase
      .from('games')
      .select('game_id, status, max_players')
      .eq('game_id', gameId)
      .limit(1);
    if (gErr) throw new Error(gErr.message);
    if (!gameRows || gameRows.length === 0) throw new Error('Game not found');
    const game = gameRows[0];
    if (game.status !== 'waiting') throw new Error('Game already started');

    const { count, error: cErr } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);
    if (cErr) throw new Error(cErr.message);
    if ((count || 0) >= (game.max_players || 6)) throw new Error('Game is full');

    const { error: insErr } = await supabase.from('game_players').insert({
      game_id: gameId,
      player_id: playerId,
      username: playerUsername,
      cards: ['hidden', 'hidden', 'hidden'],
      score: 0,
      is_active: true,
      has_initial_peek: false
    });
    if (insErr) throw new Error(insErr.message);

    const gameData = await this.loadGameAggregate(gameId);
    this.activeGames.set(gameId, gameData);
    return gameData;
  }

  async startGame(gameId) {
    const { data: players, error: pErr } = await supabase
      .from('game_players')
      .select('player_id, username, cards')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });
    if (pErr) throw new Error(pErr.message);
    if (!players || players.length < 2) throw new Error('Need at least 2 players');

    const deckCount = players.length <= 4 ? 1 : 2;
    const deck = shuffleDeck(this.createGameDeck(deckCount));

    const updatedPlayers = players.map((p) => ({
      ...p,
      cards: [deck.pop(), deck.pop(), deck.pop()]
    }));

    for (const p of updatedPlayers) {
      // eslint-disable-next-line no-await-in-loop
      const { error: upErr } = await supabase
        .from('game_players')
        .update({ cards: p.cards })
        .eq('game_id', gameId)
        .eq('player_id', p.player_id);
      if (upErr) throw new Error(upErr.message);
    }

    const { error: gUpdErr } = await supabase
      .from('games')
      .update({ deck, status: 'in_progress', current_turn: updatedPlayers[0].player_id })
      .eq('game_id', gameId);
    if (gUpdErr) throw new Error(gUpdErr.message);

    const gameData = await this.loadGameAggregate(gameId);
    this.activeGames.set(gameId, gameData);
    return gameData;
  }

  async performInitialPeek(gameId, playerId, cardIndex) {
    const gameData = this.activeGames.get(gameId);
    if (!gameData) throw new Error('Game not found');

    const player = gameData.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Player not found');
    if (player.hasInitialPeek) throw new Error('Already peeked');

    player.hasInitialPeek = true;

    const { error: upErr } = await supabase
      .from('game_players')
      .update({ has_initial_peek: true })
      .eq('game_id', gameId)
      .eq('player_id', playerId);
    if (upErr) throw new Error(upErr.message);

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
    // Persist aggregate to tables
    const { error: gErr } = await supabase
      .from('games')
      .update({
        deck: gameData.deck,
        discard_pile: gameData.discardPile,
        current_turn: gameData.currentTurn,
        status: gameData.status,
        winner: gameData.winner || null
      })
      .eq('game_id', gameId);
    if (gErr) throw new Error(gErr.message);
    for (const player of gameData.players) {
      // eslint-disable-next-line no-await-in-loop
      const { error: pErr2 } = await supabase
        .from('game_players')
        .update({
          cards: player.cards,
          score: player.score,
          is_active: player.isActive,
          has_initial_peek: player.hasInitialPeek
        })
        .eq('game_id', gameId)
        .eq('player_id', player.id);
      if (pErr2) throw new Error(pErr2.message);
    }
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
    const [{ data: ended, error: e1 }, { data: active, error: e2 }, { data: users, error: e3 }] = await Promise.all([
      supabase.from('games').select('game_id', { count: 'exact', head: true }).eq('status', 'ended'),
      supabase.from('games').select('game_id', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('users').select('user_id', { count: 'exact', head: true })
    ]);
    if (e1 || e2 || e3) throw new Error((e1||e2||e3).message);
    return {
      totalGames: ended?.length ?? ended?.count ?? 0,
      activeGames: active?.length ?? active?.count ?? 0,
      totalUsers: users?.length ?? users?.count ?? 0,
      averageGameLength: '8 minutes'
    };
  }

  async loadGameAggregate(gameId) {
    const [{ data: gameRows, error: gErr }, { data: playerRows, error: pErr }] = await Promise.all([
      supabase
        .from('games')
        .select('game_id, room_code, deck, discard_pile, current_turn, status, winner')
        .eq('game_id', gameId)
        .limit(1),
      supabase
        .from('game_players')
        .select('player_id, username, cards, score, is_active, has_initial_peek')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true })
    ]);
    if (gErr) throw new Error(gErr.message);
    if (pErr) throw new Error(pErr.message);
    const game = (gameRows && gameRows[0]) || null;
    if (!game) throw new Error('Game not found');
    return {
      gameId: game.game_id,
      roomCode: game.room_code,
      players: (playerRows || []).map((p) => ({
        id: p.player_id,
        username: p.username,
        cards: p.cards || [],
        score: p.score || 0,
        isActive: p.is_active,
        hasInitialPeek: p.has_initial_peek
      })),
      deck: game.deck || [],
      discardPile: game.discard_pile || [],
      currentTurn: game.current_turn,
      status: game.status,
      winner: game.winner || null
    };
  }
}

module.exports = { GameService };


