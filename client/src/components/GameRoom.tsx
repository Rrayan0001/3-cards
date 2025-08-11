import React, { useEffect, useState } from 'react';
import { useGame } from '../hooks/useGame';
import PlayerArea from './PlayerArea';
import '../styles/GameRoom.css';

interface GameRoomProps {
  playerData: { id: string; username: string };
  onReturnToMenu: () => void;
}

const GameRoom: React.FC<GameRoomProps> = ({ playerData, onReturnToMenu }) => {
  const { gameState, createGame, startGame } = useGame();
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  useEffect(() => {
    if (!gameState.gameId && !isCreatingGame) {
      setIsCreatingGame(true);
      const newRoomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      createGame(newRoomCode);
    }
  }, [gameState.gameId, createGame, isCreatingGame]);

  const handleStartGame = () => {
    if (gameState.players.length >= 2) {
      startGame();
    }
  };

  const isMyTurn = gameState.currentTurn === playerData.id;
  const canStartGame =
    gameState.status === 'waiting' && gameState.players.length >= 2 && gameState.players[0]?.id === playerData.id;

  if (gameState.status === 'waiting') {
    return (
      <div className="game-room waiting-room">
        <div className="room-header">
          <h2>Game Room</h2>
          <div className="room-code">
            <span>
              Room Code: <strong>{gameState.roomCode}</strong>
            </span>
            <button onClick={() => navigator.clipboard.writeText(gameState.roomCode || '')} className="copy-button">
              📋 Copy
            </button>
          </div>
        </div>

        <div className="players-waiting">
          <h3>Players ({gameState.players.length}/6)</h3>
          <div className="player-list">
            {gameState.players.map((player, index) => (
              <div key={player.id} className="waiting-player">
                <span className="player-name">{player.username}</span>
                {index === 0 && <span className="host-badge">Host</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="waiting-actions">
          {canStartGame ? (
            <button onClick={handleStartGame} className="primary-button">
              Start Game
            </button>
          ) : (
            <p>Waiting for host to start the game...</p>
          )}

          <button onClick={onReturnToMenu} className="secondary-button">
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-room">
      <div className="game-header">
        <div className="game-info">
          <h2>3-Cards Game</h2>
          <span className="room-code">Room: {gameState.roomCode}</span>
        </div>

        <div className="game-status">
          <span className="turn-indicator">
            {isMyTurn ? 'Your Turn' : `${gameState.players.find((p) => p.id === gameState.currentTurn)?.username}'s Turn`}
          </span>
          <span className="cards-remaining">Cards Left: {gameState.deck.length}</span>
        </div>
      </div>

      <PlayerArea gameState={gameState} playerData={playerData} isMyTurn={isMyTurn} />
    </div>
  );
};

export default GameRoom;


