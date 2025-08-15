import React, { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import '../styles/MainMenu.css';

interface MainMenuProps {
  playerData: { id: string; username: string } | null;
  onPlayerJoin: (playerData: { id: string; username: string }) => void;
  onGameStart: () => void;
  joinGame: (roomCode: string) => void;
  createGame: (roomCode: string, gameType?: 'multiplayer' | 'computer') => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ playerData, onPlayerJoin, onGameStart, joinGame, createGame }) => {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const { socket, connected } = useSocket();

  const handleSetUsername = () => {
    if (username.trim() && socket) {
      const playerId = Math.random().toString(36).substr(2, 9);
      socket.emit('join_as_player', { username: username.trim(), userId: playerId });
      onPlayerJoin({ id: playerId, username: username.trim() });
    }
  };

  const handleCreateGame = () => {
    const newRoomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    createGame(newRoomCode, 'multiplayer');
    onGameStart();
  };

  const handleCreateComputerGame = () => {
    const newRoomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    createGame(newRoomCode, 'computer');
    onGameStart();
  };

  const handleJoinGame = () => {
    if (roomCode.trim()) {
      joinGame(roomCode.trim());
      onGameStart();
    }
  };

  if (!connected) {
    return (
      <div className="main-menu">
        <div className="connection-status">
          <h2>Connecting to server...</h2>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!playerData) {
    return (
      <div className="main-menu">
        <div className="menu-header">
          <h1>🃏 3-Cards</h1>
          <p>The ultimate card strategy game</p>
        </div>

        <div className="username-form">
          <h2>Enter Your Name</h2>
          <input
            type="text"
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            onKeyDown={(e) => e.key === 'Enter' && handleSetUsername()}
          />
          <button onClick={handleSetUsername} disabled={!username.trim()} className="primary-button">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-menu">
      <div className="menu-header">
        <h1>🃏 3-Cards</h1>
        <p>Welcome, {playerData.username}!</p>
      </div>

      <div className="menu-options">
        <div className="game-option">
          <h3>Play vs Computer</h3>
          <p>Challenge the AI in a 1v1 game</p>
          <button onClick={handleCreateComputerGame} className="primary-button">
            🤖 Play vs Computer
          </button>
        </div>

        <div className="game-option">
          <h3>Create Multiplayer Game</h3>
          <p>Start a new game and invite friends</p>
          <button onClick={handleCreateGame} className="secondary-button">
            Create Game
          </button>
        </div>

        <div className="game-option">
          <h3>Join Game</h3>
          <p>Enter a room code to join an existing game</p>
          {!showJoinForm ? (
            <button onClick={() => setShowJoinForm(true)} className="secondary-button">
              Join Game
            </button>
          ) : (
            <div className="join-form">
              <input
                type="text"
                placeholder="Room Code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <div className="join-buttons">
                <button onClick={handleJoinGame} disabled={!roomCode.trim()} className="primary-button">
                  Join
                </button>
                <button onClick={() => setShowJoinForm(false)} className="secondary-button">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="game-info">
        <h3>How to Play</h3>
        <ul>
          <li>Each player gets 3 hidden cards</li>
          <li>Goal: Have the lowest total when deck runs out</li>
          <li>Power cards have special abilities</li>
          <li>2-6 players supported</li>
        </ul>
      </div>
    </div>
  );
};

export default MainMenu;


