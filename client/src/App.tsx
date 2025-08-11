import React, { useState } from 'react';
import { SocketProvider } from './hooks/useSocket';
import { GameProvider } from './hooks/useGame';
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
    <div className="App">
      <SocketProvider>
        <GameProvider>
          {appState.screen === 'menu' ? (
            <MainMenu
              playerData={appState.playerData}
              onPlayerJoin={handlePlayerJoin}
              onGameStart={handleGameStart}
            />
          ) : (
            <GameRoom playerData={appState.playerData!} onReturnToMenu={handleReturnToMenu} />
          )}
        </GameProvider>
      </SocketProvider>
    </div>
  );
}

export default App;


