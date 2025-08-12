import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../hooks/useGame';
import '../styles/Modals.css';

interface PowerCardModalProps {
  powerCardData: any; // from CARD_DRAWN event
  gameState: any;
  playerData: { id: string; username: string };
}

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const modal = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

const PowerCardModal: React.FC<PowerCardModalProps> = ({ powerCardData, gameState, playerData }) => {
  const { performPowerCard } = useGame();
  const rank = (powerCardData?.card || '').charAt(0);
  const isK = rank === 'K';
  const isQ = rank === 'Q';
  const isJ = rank === 'J';
  const is7 = rank === '7';

  const opponents = useMemo(
    () => gameState.players.filter((p: any) => p.id !== playerData.id),
    [gameState.players, playerData.id]
  );

  const [targetPlayerId, setTargetPlayerId] = useState(opponents[0]?.id || '');
  const [cardIndex, setCardIndex] = useState<number>(0);
  const [myCardIndex, setMyCardIndex] = useState<number>(0);

  const description = useMemo(() => {
    const map: Record<string, string> = {
      K: 'Peek at one of your own cards',
      Q: 'Swap one of your cards with an opponent\'s card',
      J: "Peek at one of an opponent's cards",
      7: "Shuffle an opponent's cards"
    };
    return map[rank] || '';
  }, [rank]);

  const submit = () => {
    if (isK) {
      performPowerCard({ cardIndex });
      return;
    }
    if (isJ) {
      performPowerCard({ targetPlayerId, cardIndex });
      return;
    }
    if (isQ) {
      performPowerCard({ targetPlayerId, playerCardIndex: myCardIndex, targetCardIndex: cardIndex });
      return;
    }
    if (is7) {
      performPowerCard({ targetPlayerId });
    }
  };

  return (
    <AnimatePresence>
      <motion.div className="modal-backdrop" variants={backdrop} initial="hidden" animate="visible" exit="hidden">
        <motion.div className="modal-card" variants={modal} initial="hidden" animate="visible" exit="hidden">
          <div className="modal-header">
            <span className="badge">Power Card</span>
            <h3>{rank} — {description}</h3>
          </div>

          <div className="modal-body">
            {isK && (
              <div className="modal-field">
                <label>Select one of your cards</label>
                <div className="pill-group">
                  {[0, 1, 2].map((i) => (
                    <button
                      key={i}
                      className={`pill ${cardIndex === i ? 'active' : ''}`}
                      onClick={() => setCardIndex(i)}
                    >
                      Card {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isJ && (
              <>
                <div className="modal-field">
                  <label>Opponent</label>
                  <select value={targetPlayerId} onChange={(e) => setTargetPlayerId(e.target.value)}>
                    {opponents.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.username}</option>
                    ))}
                  </select>
                </div>
                <div className="modal-field">
                  <label>Opponent card</label>
                  <div className="pill-group">
                    {[0, 1, 2].map((i) => (
                      <button
                        key={i}
                        className={`pill ${cardIndex === i ? 'active' : ''}`}
                        onClick={() => setCardIndex(i)}
                      >
                        Card {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {isQ && (
              <>
                <div className="modal-field">
                  <label>Your card</label>
                  <div className="pill-group">
                    {[0, 1, 2].map((i) => (
                      <button
                        key={i}
                        className={`pill ${myCardIndex === i ? 'active' : ''}`}
                        onClick={() => setMyCardIndex(i)}
                      >
                        Card {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="modal-field">
                  <label>Opponent</label>
                  <select value={targetPlayerId} onChange={(e) => setTargetPlayerId(e.target.value)}>
                    {opponents.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.username}</option>
                    ))}
                  </select>
                </div>
                <div className="modal-field">
                  <label>Opponent card</label>
                  <div className="pill-group">
                    {[0, 1, 2].map((i) => (
                      <button
                        key={i}
                        className={`pill ${cardIndex === i ? 'active' : ''}`}
                        onClick={() => setCardIndex(i)}
                      >
                        Card {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {is7 && (
              <div className="modal-field">
                <label>Opponent to shuffle</label>
                <select value={targetPlayerId} onChange={(e) => setTargetPlayerId(e.target.value)}>
                  {opponents.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.username}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button className="secondary-button" onClick={() => window.dispatchEvent(new CustomEvent('close_power_modal'))}>Cancel</button>
            <button className="primary-button" onClick={submit}>Use</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PowerCardModal;


