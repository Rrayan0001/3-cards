class SocketHandler {
  constructor(io, gameService) {
    this.io = io;
    this.gameService = gameService;
    this.connectedPlayers = new Map();

    this.io.on('connection', (socket) => {
      // eslint-disable-next-line no-console
      console.log(`Player connected: ${socket.id}`);
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    socket.on('join_as_player', async (data) => {
      const { username, userId } = data;
      this.connectedPlayers.set(socket.id, {
        userId: userId || socket.id,
        username,
        socket
      });
      socket.emit('player_connected', {
        playerId: userId || socket.id,
        username
      });
    });

    socket.on('create_game', async (data) => {
      try {
        const { roomCode } = data;
        const player = this.connectedPlayers.get(socket.id);
        if (!player) {
          socket.emit('error', { message: 'Player not identified' });
          return;
        }
        const gameData = await this.gameService.createGame(player.userId, player.username, roomCode);
        socket.join(gameData.gameId);
        socket.emit('game_created', gameData);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('join_game', async (data) => {
      try {
        const { roomCode } = data;
        const player = this.connectedPlayers.get(socket.id);
        if (!player) {
          socket.emit('error', { message: 'Player not identified' });
          return;
        }
        const { supabase } = require('../db/supabaseClient');
        const { data: games, error } = await supabase
          .from('games')
          .select('game_id, status')
          .eq('room_code', roomCode)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) throw new Error(error.message);
        const game = games && games[0];
        if (!game || game.status !== 'waiting') {
          socket.emit('error', { message: 'Game not found or already started' });
          return;
        }
        const gameData = await this.gameService.joinGame(game.game_id, player.userId, player.username);
        socket.join(game.game_id);
        this.io.to(game.game_id).emit('player_joined', gameData);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('start_game', async (data) => {
      try {
        const { gameId } = data;
        const gameData = await this.gameService.startGame(gameId);
        this.io.to(gameId).emit('game_started', {
          ...gameData,
          players: gameData.players.map((player) => ({
            ...player,
            cards: player.cards.map(() => 'hidden')
          }))
        });
        gameData.players.forEach((player) => {
          const playerSocket = this.findSocketByUserId(player.id);
          if (playerSocket) {
            playerSocket.emit('your_cards', {
              cards: gameData.players.find((p) => p.id === player.id).cards
            });
          }
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('initial_peek', async (data) => {
      try {
        const { gameId, cardIndex } = data;
        const player = this.connectedPlayers.get(socket.id);
        const result = await this.gameService.performInitialPeek(gameId, player.userId, cardIndex);
        socket.emit('peek_result', result);
        const gameData = this.gameService.activeGames.get(gameId);
        const allPeeked = gameData.players.every((p) => p.hasInitialPeek);
        if (allPeeked) {
          this.io.to(gameId).emit('all_players_ready');
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('draw_card', async (data) => {
      try {
        const { gameId } = data;
        const player = this.connectedPlayers.get(socket.id);
        const result = await this.gameService.drawCard(gameId, player.userId);
        socket.emit('card_drawn', result);
        socket.to(gameId).emit('player_drew_card', {
          playerId: player.userId,
          remainingCards: this.gameService.activeGames.get(gameId).deck.length
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('power_card_action', async (data) => {
      try {
        const { gameId, powerCard, targetData } = data;
        const player = this.connectedPlayers.get(socket.id);
        const result = await this.gameService.processPowerCard(gameId, player.userId, powerCard, targetData);
        if (result.type === 'peek_own') {
          socket.emit('peek_result', result);
        } else if (result.type === 'peek_opponent') {
          socket.emit('peek_result', result);
        } else if (result.type === 'swap') {
          const targetSocket = this.findSocketByUserId(result.targetPlayerId);
          socket.emit('swap_completed', result);
          if (targetSocket) {
            targetSocket.emit('cards_swapped', {
              withPlayer: player.userId,
              cardIndex: result.targetCardIndex
            });
          }
        } else if (result.type === 'shuffle') {
          const targetSocket = this.findSocketByUserId(result.targetPlayerId);
          if (targetSocket) {
            const gameData = this.gameService.activeGames.get(gameId);
            const targetPlayer = gameData.players.find((p) => p.id === result.targetPlayerId);
            targetSocket.emit('cards_shuffled', {
              newCards: targetPlayer.cards,
              byPlayer: player.userId
            });
          }
        }
        this.io.to(gameId).emit('power_card_used', {
          playerId: player.userId,
          powerCard: powerCard.charAt(0),
          effectType: result.type
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('make_move', async (data) => {
      try {
        const { gameId, action, cardIndex, drawnCard } = data;
        const player = this.connectedPlayers.get(socket.id);
        const result = await this.gameService.makeMove(gameId, player.userId, action, cardIndex, drawnCard);
        if (result.gameEnded) {
          const endResult = await this.gameService.endGame(gameId);
          this.io.to(gameId).emit('game_ended', endResult);
        } else {
          const gameData = this.gameService.activeGames.get(gameId);
          this.io.to(gameId).emit('game_updated', {
            currentTurn: gameData.currentTurn,
            discardPile: gameData.discardPile,
            remainingCards: gameData.deck.length
          });
          const playerData = gameData.players.find((p) => p.id === player.userId);
          socket.emit('your_cards', { cards: playerData.cards });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log(`Player disconnected: ${socket.id}`);
      this.connectedPlayers.delete(socket.id);
    });
  }

  findSocketByUserId(userId) {
    for (const [, playerData] of this.connectedPlayers) {
      if (playerData.userId === userId) {
        return playerData.socket;
      }
    }
    return null;
  }
}

module.exports = { SocketHandler };


