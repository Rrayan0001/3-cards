import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Modals.css';

interface PlayerScore {
  id: string;
  username: string;
  score: number;
}

interface GameEndModalProps {
  finalScores: PlayerScore[];
  winner: string | null;
  onReturnToMenu: () => void;
}

const GameEndModal: React.FC<GameEndModalProps> = ({ finalScores, winner, onReturnToMenu }) => {
  const sorted = [...finalScores].sort((a, b) => a.score - b.score);
  return (
    <AnimatePresence>
      <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="modal-card" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>
          <div className="modal-header">
            <span className="badge">Game Over</span>
            <h3>Winner: {sorted[0]?.username}</h3>
          </div>

          <div className="modal-body">
            <ul className="score-list">
              {sorted.map((p, i) => (
                <li key={p.id} className={p.id === winner ? 'winner' : ''}>
                  <span>{i + 1}. {p.username}</span>
                  <strong>{p.score}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="modal-actions">
            <button className="primary-button" onClick={onReturnToMenu}>Back to Menu</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GameEndModal;


