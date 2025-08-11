function createDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];
  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      deck.push(rank + suit);
    });
  });
  deck.push('Joker♠', 'Joker♥');
  return deck;
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getCardValue(card) {
  if (card === 'hidden') return 0;
  if (card.startsWith('Joker')) return 1;
  const rank = card.slice(0, -1);
  if (rank === 'A') return 1;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

function calculateScore(cards) {
  return cards.reduce((sum, card) => sum + getCardValue(card), 0);
}

function getPowerCardEffect(card) {
  const rank = card.charAt(0);
  const effects = {
    K: 'Peek at one of your own cards',
    Q: 'Swap one card with an opponent',
    J: "Peek at one opponent's card",
    7: "Shuffle an opponent's cards"
  };
  return effects[rank] || null;
}

function isPowerCard(card) {
  const rank = card.charAt(0);
  return ['K', 'Q', 'J', '7'].includes(rank);
}

function validateGameState(gameData) {
  const errors = [];
  if (gameData.players.length < 2 || gameData.players.length > 6) {
    errors.push('Invalid player count');
  }
  gameData.players.forEach((player, index) => {
    if (player.cards.length !== 3) {
      errors.push(`Player ${index + 1} doesn't have exactly 3 cards`);
    }
  });
  const expectedDeckSize = gameData.players.length <= 4 ? 54 : 108;
  const usedCards = gameData.players.length * 3 + gameData.discardPile.length;
  const totalCards = gameData.deck.length + usedCards;
  if (totalCards !== expectedDeckSize) {
    errors.push('Incorrect total card count');
  }
  return errors;
}

function getNextPlayer(players, currentPlayerId) {
  const currentIndex = players.findIndex((p) => p.id === currentPlayerId);
  if (currentIndex === -1) return null;
  const nextIndex = (currentIndex + 1) % players.length;
  return players[nextIndex];
}

function shouldGameEnd(gameData) {
  return gameData.deck.length === 0;
}

function determineWinner(players) {
  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = calculateScore(a.cards);
    const scoreB = calculateScore(b.cards);
    return scoreA - scoreB;
  });
  return {
    winner: sortedPlayers[0],
    rankings: sortedPlayers.map((player, index) => ({
      ...player,
      rank: index + 1,
      score: calculateScore(player.cards)
    }))
  };
}

module.exports = {
  createDeck,
  shuffleDeck,
  getCardValue,
  calculateScore,
  getPowerCardEffect,
  isPowerCard,
  validateGameState,
  getNextPlayer,
  shouldGameEnd,
  determineWinner
};


