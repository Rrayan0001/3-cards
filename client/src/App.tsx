import React, { useState } from 'react';
import { SocketProvider } from './hooks/useSocket';
import { GameProvider, useGame } from './hooks/useGame';
import MainMenu from './components/MainMenu';
import GameRoom from './components/GameRoom';
import './styles/App.css';

interface AppState {
  screen: 'menu' | 'game';
  playerData: {
    id: string;
    username: string;
  } | null;
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    screen: 'menu',
    playerData: null
  });

  const handlePlayerJoin = (playerData: { id: string; username: string }) => {
    setAppState({ screen: 'menu', playerData });
  };

  const handleGameStart = () => {
    setAppState((prev) => ({ ...prev, screen: 'game' }));
  };

  const handleReturnToMenu = () => {
    setAppState((prev) => ({ screen: 'menu', playerData: prev.playerData }));
  };

  return (
    <div
      className="App"
      style={{
        backgroundImage: `linear-gradient(to bottom right, rgba(49,5,81,0.55), rgba(24,24,24,0.22)), url(${process.env.PUBLIC_URL}/123.jpg)`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed'
      }}
    >
      <SocketProvider>
        <GameProvider>
          <AppContent 
            appState={appState}
            onPlayerJoin={handlePlayerJoin}
            onGameStart={handleGameStart}
            onReturnToMenu={handleReturnToMenu}
          />
        </GameProvider>
      </SocketProvider>
    </div>
  );
}

function AppContent({ 
  appState, 
  onPlayerJoin, 
  onGameStart, 
  onReturnToMenu 
}: { 
  appState: AppState; 
  onPlayerJoin: (playerData: { id: string; username: string }) => void;
  onGameStart: () => void;
  onReturnToMenu: () => void;
}) {
  const { joinGame } = useGame();

  return appState.screen === 'menu' ? (
    <MainMenu
      playerData={appState.playerData}
      onPlayerJoin={onPlayerJoin}
      onGameStart={onGameStart}
      joinGame={joinGame}
    />
  ) : (
    <GameRoom playerData={appState.playerData!} onReturnToMenu={onReturnToMenu} />
  );
}

export default App;


