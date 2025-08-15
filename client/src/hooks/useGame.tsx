import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useSocket } from './useSocket';

interface Player {
  id: string;
  username: string;
  cards: string[];
  score: number;
  isActive: boolean;
  hasInitialPeek: boolean;
}

interface GameState {
  gameId: string | null;
  roomCode: string | null;
  players: Player[];
  currentTurn: string | null;
  status: 'waiting' | 'starting' | 'in_progress' | 'ended';
  deck: string[];
  discardPile: string[];
  drawnCard: string | null;
  showPowerCardModal: boolean;
  powerCardData: any;
  myPlayerId: string | null;
  myCards: string[];
  winner: string | null;
  finalScores: Player[];
}

type GameAction =
  | { type: 'GAME_CREATED'; payload: any }
  | { type: 'PLAYER_JOINED'; payload: any }
  | { type: 'GAME_STARTED'; payload: any }
  | { type: 'YOUR_CARDS'; payload: { cards: string[] } }
  | { type: 'CARD_DRAWN'; payload: any }
  | { type: 'POWER_CARD_MODAL'; payload: { show: boolean; data?: any } }
  | { type: 'GAME_UPDATED'; payload: any }
  | { type: 'GAME_ENDED'; payload: any }
  | { type: 'RESET_GAME' };

const initialState: GameState = {
  gameId: null,
  roomCode: null,
  players: [],
  currentTurn: null,
  status: 'waiting',
  deck: [],
  discardPile: [],
  drawnCard: null,
  showPowerCardModal: false,
  powerCardData: null,
  myPlayerId: null,
  myCards: [],
  winner: null,
  finalScores: []
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'GAME_CREATED':
      return {
        ...state,
        gameId: action.payload.gameId,
        roomCode: action.payload.roomCode,
        players: action.payload.players,
        status: action.payload.status
      };
    case 'PLAYER_JOINED':
      return { ...state, players: action.payload.players };
    case 'GAME_STARTED':
      return {
        ...state,
        status: 'in_progress',
        players: action.payload.players,
        currentTurn: action.payload.currentTurn,
        deck: action.payload.deck,
        discardPile: action.payload.discardPile
      };
    case 'YOUR_CARDS':
      return { ...state, myCards: action.payload.cards };
    case 'CARD_DRAWN':
      return {
        ...state,
        drawnCard: action.payload.card,
        showPowerCardModal: action.payload.isPowerCard,
        powerCardData: action.payload.isPowerCard ? action.payload : null
      };
    case 'POWER_CARD_MODAL':
      return { ...state, showPowerCardModal: action.payload.show, powerCardData: action.payload.data || null };
    case 'GAME_UPDATED':
      return {
        ...state,
        currentTurn: action.payload.currentTurn,
        discardPile: action.payload.discardPile,
        deck: Array(action.payload.remainingCards).fill('hidden'),
        drawnCard: null
      };
    case 'GAME_ENDED':
      return {
        ...state,
        status: 'ended',
        winner: action.payload.winner.id,
        finalScores: action.payload.finalScores
      };
    case 'RESET_GAME':
      return initialState;
    default:
      return state;
  }
}

interface GameContextType {
  gameState: GameState;
  createGame: (roomCode: string) => void;
  joinGame: (roomCode: string) => void;
  startGame: () => void;
  drawCard: () => void;
  makeMove: (action: 'swap' | 'discard', cardIndex?: number) => void;
  performPowerCard: (targetData: any) => void;
  initialPeek: (cardIndex: number) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};

interface GameProviderProps {
  children: React.ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    
    console.log('🎯 Setting up Socket.IO event listeners...');
    
    socket.on('game_created', (data) => {
      console.log('✅ Received game_created event:', data);
      dispatch({ type: 'GAME_CREATED', payload: data });
    });
    
    socket.on('player_joined', (data) => {
      console.log('👥 Received player_joined event:', data);
      dispatch({ type: 'PLAYER_JOINED', payload: data });
    });
    
    socket.on('game_started', (data) => {
      console.log('🚀 Received game_started event:', data);
      dispatch({ type: 'GAME_STARTED', payload: data });
    });
    
    socket.on('your_cards', (data) => {
      console.log('🃏 Received your_cards event:', data);
      dispatch({ type: 'YOUR_CARDS', payload: data });
    });
    
    socket.on('card_drawn', (data) => {
      console.log('🎴 Received card_drawn event:', data);
      dispatch({ type: 'CARD_DRAWN', payload: data });
    });
    
    socket.on('game_updated', (data) => {
      console.log('🔄 Received game_updated event:', data);
      dispatch({ type: 'GAME_UPDATED', payload: data });
    });
    
    socket.on('game_ended', (data) => {
      console.log('🏁 Received game_ended event:', data);
      dispatch({ type: 'GAME_ENDED', payload: data });
    });
    
    socket.on('error', (error) => {
      console.error('❌ Received error event:', error); // Added debug
      
      // Handle specific database timeout errors
      if (error.message && error.message.includes('timed out')) {
        // eslint-disable-next-line no-alert
        alert('⚠️ Server is experiencing high load. Please try again in a few moments or use the local version for now.');
      } else {
        // eslint-disable-next-line no-alert
        alert(error.message);
      }
    });
    
    return () => {
      console.log('🧹 Cleaning up Socket.IO event listeners...');
      socket.off('game_created');
      socket.off('player_joined');
      socket.off('game_started');
      socket.off('your_cards');
      socket.off('card_drawn');
      socket.off('game_updated');
      socket.off('game_ended');
      socket.off('error');
    };
  }, [socket]);

  const createGame = (roomCode: string) => {
    console.log('🎮 Emitting create_game event:', { roomCode });
    if (socket) {
      socket.emit('create_game', { roomCode });
      console.log('📤 create_game event sent successfully');
    } else {
      console.error('❌ Cannot create game: socket not connected');
    }
  };
  const joinGame = (roomCode: string) => {
    console.log('🎮 Emitting join_game event:', { roomCode });
    if (socket) {
      socket.emit('join_game', { roomCode });
      console.log('📤 join_game event sent successfully');
    } else {
      console.error('❌ Cannot join game: socket not connected');
    }
  };
  const startGame = () => {
    if (socket && gameState.gameId) socket.emit('start_game', { gameId: gameState.gameId });
  };
  const drawCard = () => {
    if (socket && gameState.gameId) socket.emit('draw_card', { gameId: gameState.gameId });
  };
  const makeMove = (action: 'swap' | 'discard', cardIndex?: number) => {
    if (socket && gameState.gameId) {
      socket.emit('make_move', { gameId: gameState.gameId, action, cardIndex, drawnCard: gameState.drawnCard });
      dispatch({ type: 'POWER_CARD_MODAL', payload: { show: false } });
    }
  };
  const performPowerCard = (targetData: any) => {
    if (socket && gameState.gameId && gameState.drawnCard) {
      socket.emit('power_card_action', { gameId: gameState.gameId, powerCard: gameState.drawnCard, targetData });
    }
  };
  const initialPeek = (cardIndex: number) => {
    if (socket && gameState.gameId) socket.emit('initial_peek', { gameId: gameState.gameId, cardIndex });
  };

  return (
    <GameContext.Provider
      value={{ gameState, createGame, joinGame, startGame, drawCard, makeMove, performPowerCard, initialPeek }}
    >
      {children}
    </GameContext.Provider>
  );
};


