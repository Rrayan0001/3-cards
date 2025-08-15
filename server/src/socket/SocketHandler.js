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
    console.log(`🔌 New socket connection: ${socket.id}`);

    socket.on('join_as_player', async (data) => {
      console.log(`👤 Player joining: ${data.username} (${data.userId || socket.id})`);
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
      console.log(`✅ Player ${username} connected successfully`);
    });

    socket.on('create_game', async (data) => {
      console.log(`🎮 Create game request:`, data);
      try {
        const { roomCode, gameType = 'multiplayer' } = data;
        const player = this.connectedPlayers.get(socket.id);
        console.log(`🔍 Looking for player with socket ${socket.id}:`, player);
        
        if (!player) {
          console.error(`❌ Player not found for socket ${socket.id}`);
          socket.emit('error', { message: 'Player not identified. Please refresh and try again.' });
          return;
        }
        
        console.log(`✅ Creating ${gameType} game for player ${player.username} with room code ${roomCode}`);
        
        let gameData;
        if (gameType === 'computer') {
          gameData = await this.gameService.createComputerGame(player.userId, player.username, roomCode);
        } else {
          gameData = await this.gameService.createGame(player.userId, player.username, roomCode);
        }
        
        console.log(`🎯 Game created successfully:`, gameData);
        
        socket.join(gameData.gameId);
        socket.emit('game_created', gameData);
        console.log(`📤 game_created event sent to ${socket.id}`);
      } catch (error) {
        console.error(`❌ Error creating game:`, error);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('join_game', async (data) => {
      try {
        console.log('🎮 Join game request:', data);
        const { roomCode } = data;
        const player = this.connectedPlayers.get(socket.id);
        if (!player) {
          console.error('❌ Player not found for socket', socket.id);
          socket.emit('error', { message: 'Player not identified' });
          return;
        }
        console.log('✅ Joining game for player', player.username, 'with room code', roomCode);
        
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
          console.error('❌ Game not found or already started:', roomCode);
          socket.emit('error', { message: 'Game not found or already started' });
          return;
        }
        console.log('✅ Found game:', game.game_id);
        const gameData = await this.gameService.joinGame(game.game_id, player.userId, player.username);
        socket.join(game.game_id);
        this.io.to(game.game_id).emit('player_joined', gameData);
        console.log('✅ Player', player.username, 'successfully joined game', game.game_id);
      } catch (error) {
        console.error('❌ Error joining game:', error);
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
          
          // Check if next turn is computer player
          this.handleComputerTurn(gameId, gameData);
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

  async handleComputerTurn(gameId, gameData) {
    const computerPlayer = gameData.players.find(p => p.isComputer);
    if (!computerPlayer || gameData.currentTurn !== computerPlayer.id) {
      return;
    }

    console.log(`🤖 Computer player ${computerPlayer.username} taking turn...`);
    
    // Add a small delay to make it feel more natural
    setTimeout(async () => {
      try {
        const { ComputerPlayer: ComputerPlayerAI } = require('../ai/ComputerPlayer');
        const ai = new ComputerPlayerAI(computerPlayer.username);
        
        // Get current game state
        const currentGameData = this.gameService.activeGames.get(gameId);
        if (!currentGameData) return;
        
        const decision = ai.makeDecision(currentGameData, computerPlayer.id);
        console.log(`🤖 Computer decision:`, decision);
        
        if (!decision) {
          // If no decision, just draw a card
          await this.gameService.drawCard(gameId, computerPlayer.id);
          this.io.to(gameId).emit('game_updated', {
            currentTurn: currentGameData.currentTurn,
            discardPile: currentGameData.discardPile,
            remainingCards: currentGameData.deck.length
          });
          return;
        }
        
        // Execute computer decision
        if (decision.action === 'draw') {
          await this.gameService.drawCard(gameId, computerPlayer.id);
        } else if (decision.action === 'swap' || decision.action === 'discard') {
          await this.gameService.makeMove(gameId, computerPlayer.id, decision.action, decision.cardIndex, currentGameData.drawnCard);
        } else if (decision.action === 'power_card') {
          await this.gameService.processPowerCard(gameId, computerPlayer.id, decision.powerCard, decision.targetData);
        }
        
        // Update game state
        const updatedGameData = this.gameService.activeGames.get(gameId);
        if (updatedGameData) {
          this.io.to(gameId).emit('game_updated', {
            currentTurn: updatedGameData.currentTurn,
            discardPile: updatedGameData.discardPile,
            remainingCards: updatedGameData.deck.length
          });
          
          // Check if game ended
          if (updatedGameData.status === 'ended') {
            const endResult = await this.gameService.endGame(gameId);
            this.io.to(gameId).emit('game_ended', endResult);
          } else {
            // Check if next turn is also computer
            this.handleComputerTurn(gameId, updatedGameData);
          }
        }
        
      } catch (error) {
        console.error('❌ Computer turn error:', error);
      }
    }, 1500); // 1.5 second delay
  }
}

module.exports = { SocketHandler };


