import React, { useState } from 'react';
import { useGame } from '../hooks/useGame';
import { motion } from 'framer-motion';
import '../styles/PlayerArea.css';

interface PlayerAreaProps {
  gameState: any;
  playerData: { id: string; username: string };
  isMyTurn: boolean;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ gameState, playerData, isMyTurn }) => {
  const { drawCard, makeMove, initialPeek } = useGame();
  const [peekedCards, setPeekedCards] = useState<number[]>([]);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const handleCardClick = (cardIndex: number) => {
    if (gameState.status === 'starting' && !peekedCards.includes(cardIndex)) {
      initialPeek(cardIndex);
      setPeekedCards([...peekedCards, cardIndex]);
    } else if (gameState.drawnCard && isMyTurn) {
      setSelectedCard(cardIndex);
    }
  };

  const handleDrawCard = () => {
    if (isMyTurn && !gameState.drawnCard) {
      drawCard();
    }
  };

  const handleSwapCard = () => {
    if (selectedCard !== null && gameState.drawnCard) {
      makeMove('swap', selectedCard);
      setSelectedCard(null);
    }
  };

  const handleDiscardCard = () => {
    if (gameState.drawnCard) {
      makeMove('discard');
    }
  };

  const getCardDisplay = (card: string) => {
    if (card === 'hidden') return '🂠';
    return card;
  };

  const isCardRevealed = (index: number) => peekedCards.includes(index) || gameState.status === 'ended';

  return (
    <div className="player-area">
      <div className="player-info">
        <h3>{playerData.username}</h3>
        <span className="player-status">{isMyTurn ? '👑 Your Turn' : '⏳ Waiting'}</span>
      </div>

      <div className="player-cards">
        <h4>Your Cards</h4>
        <div className="cards-container">
          {gameState.myCards.map((card: string, index: number) => (
            <motion.div
              key={index}
              className={`card ${selectedCard === index ? 'selected' : ''} ${isCardRevealed(index) ? 'revealed' : ''}`}
              onClick={() => handleCardClick(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ rotateY: isCardRevealed(index) ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              <div className="card-front">{getCardDisplay(card)}</div>
              <div className="card-back">🂠</div>
            </motion.div>
          ))}
        </div>
      </div>

      {gameState.drawnCard && (
        <div className="drawn-card-area">
          <h4>Drawn Card</h4>
          <div className="drawn-card">{gameState.drawnCard}</div>
          <div className="action-buttons">
            <button onClick={handleSwapCard} disabled={selectedCard === null} className="primary-button">
              Swap with Selected Card
            </button>
            <button onClick={handleDiscardCard} className="secondary-button">
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="player-actions">
        {!gameState.drawnCard && isMyTurn && (
          <button onClick={handleDrawCard} className="primary-button draw-button">
            Draw Card
          </button>
        )}
      </div>
    </div>
  );
};

export default PlayerArea;


