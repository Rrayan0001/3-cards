import React from 'react';
import { motion } from 'framer-motion';
import '../styles/GameBoard.css';

interface GameBoardProps {
  gameState: any;
  playerData: { id: string; username: string };
  isMyTurn: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, playerData }) => {
  const opponents = gameState.players.filter((p: any) => p.id !== playerData.id);
  return (
    <div className="game-board">
      {opponents.map((op: any) => (
        <motion.div key={op.id} className="opponent-card" whileHover={{ scale: 1.02 }}>
          <div className="opponent-header">
            <span className="avatar">{op.username.slice(0, 1).toUpperCase()}</span>
            <div className="meta">
              <strong>{op.username}</strong>
              <small>{op.id === gameState.currentTurn ? 'Playing…' : 'Waiting'}</small>
            </div>
          </div>
          <div className="opponent-cards">
            {(op.cards || ['hidden', 'hidden', 'hidden']).map((_: string, idx: number) => (
              <div key={idx} className="mini-card">🂠</div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default GameBoard;


