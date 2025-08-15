const { calculateScore, getPowerCardEffect } = require('../../../shared/gameLogic');

class ComputerPlayer {
  constructor(username = 'Computer') {
    this.username = username;
    this.difficulty = 'medium'; // easy, medium, hard
  }

  // Main decision making function
  makeDecision(gameState, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return null;

    const currentScore = this.calculateCurrentScore(player.cards);
    const deckSize = gameState.deck.length;
    const discardPileSize = gameState.discardPile.length;

    // If we have a power card, use it strategically
    if (this.hasPowerCard(player.cards)) {
      return this.decidePowerCardAction(gameState, playerId);
    }

    // If we have a drawn card, decide what to do with it
    if (gameState.drawnCard) {
      return this.decideDrawnCardAction(gameState, playerId);
    }

    // If it's our turn to draw, decide whether to draw
    if (gameState.currentTurn === playerId && deckSize > 0) {
      return this.decideDrawAction(gameState, playerId);
    }

    return null;
  }

  // Decide what to do with a drawn card
  decideDrawnCardAction(gameState, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    const currentScore = this.calculateCurrentScore(player.cards);
    const drawnCard = gameState.drawnCard;

    // Check if drawn card is a power card
    if (this.isPowerCard(drawnCard)) {
      return this.decidePowerCardAction(gameState, playerId);
    }

    // Calculate potential scores for each action
    const swapScores = [];
    for (let i = 0; i < player.cards.length; i++) {
      if (player.cards[i] !== 'hidden') {
        const newCards = [...player.cards];
        newCards[i] = drawnCard;
        swapScores.push({
          index: i,
          score: calculateScore(newCards),
          card: player.cards[i]
        });
      }
    }

    // Find the best swap option
    const bestSwap = swapScores.reduce((best, current) => {
      return current.score < best.score ? current : best;
    }, swapScores[0]);

    // Decide whether to swap or discard
    const shouldSwap = this.shouldSwapCard(currentScore, bestSwap.score, gameState);
    
    if (shouldSwap) {
      return {
        action: 'swap',
        cardIndex: bestSwap.index,
        reason: `Swapping ${bestSwap.card} with ${drawnCard} to reduce score from ${currentScore} to ${bestSwap.score}`
      };
    } else {
      return {
        action: 'discard',
        reason: `Discarding ${drawnCard} to keep current score of ${currentScore}`
      };
    }
  }

  // Decide whether to use a power card
  decidePowerCardAction(gameState, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    const powerCards = player.cards.filter(card => this.isPowerCard(card));
    
    if (powerCards.length === 0) return null;

    // Find the best power card to use
    const bestPowerCard = this.findBestPowerCard(powerCards, gameState, playerId);
    
    if (!bestPowerCard) return null;

    // Find the best target for the power card
    const target = this.findBestTarget(bestPowerCard, gameState, playerId);
    
    return {
      action: 'power_card',
      powerCard: bestPowerCard,
      targetData: target,
      reason: `Using ${bestPowerCard} to ${target.action}`
    };
  }

  // Decide whether to draw a card
  decideDrawAction(gameState, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    const currentScore = this.calculateCurrentScore(player.cards);
    const deckSize = gameState.deck.length;
    const otherPlayers = gameState.players.filter(p => p.id !== playerId);
    
    // Calculate average score of other players
    const otherScores = otherPlayers.map(p => this.calculateCurrentScore(p.cards));
    const avgOtherScore = otherScores.reduce((sum, score) => sum + score, 0) / otherScores.length;

    // If we have a very low score and others have high scores, don't draw
    if (currentScore <= 5 && avgOtherScore > 15) {
      return {
        action: 'skip_draw',
        reason: `Current score ${currentScore} is much lower than average ${avgOtherScore.toFixed(1)}`
      };
    }

    // If deck is running low, be more aggressive
    if (deckSize <= 10) {
      return {
        action: 'draw',
        reason: `Deck is running low (${deckSize} cards), drawing to find better cards`
      };
    }

    // If we have a high score, draw to try to improve
    if (currentScore > 15) {
      return {
        action: 'draw',
        reason: `High score ${currentScore}, drawing to try to improve`
      };
    }

    // Default: draw if it's safe
    return {
      action: 'draw',
      reason: `Drawing to improve position`
    };
  }

  // Helper methods
  calculateCurrentScore(cards) {
    const visibleCards = cards.filter(card => card !== 'hidden');
    return calculateScore(visibleCards);
  }

  hasPowerCard(cards) {
    return cards.some(card => this.isPowerCard(card));
  }

  isPowerCard(card) {
    return card && (card.includes('Joker') || card.includes('A'));
  }

  shouldSwapCard(currentScore, newScore, gameState) {
    // Always swap if it improves our score
    if (newScore < currentScore) return true;
    
    // If it's a small increase, consider the game state
    const scoreIncrease = newScore - currentScore;
    const deckSize = gameState.deck.length;
    
    // If deck is running low, be more conservative
    if (deckSize <= 5) {
      return scoreIncrease <= 2; // Only accept small increases
    }
    
    // If deck is full, be more aggressive
    if (deckSize > 20) {
      return scoreIncrease <= 5; // Accept larger increases
    }
    
    return scoreIncrease <= 3; // Default threshold
  }

  findBestPowerCard(powerCards, gameState, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    const currentScore = this.calculateCurrentScore(player.cards);
    
    // Prioritize Jokers (they can be used for any action)
    const jokers = powerCards.filter(card => card.includes('Joker'));
    if (jokers.length > 0) {
      return jokers[0];
    }
    
    // If we have a high score, use Aces to peek at hidden cards
    if (currentScore > 12) {
      const aces = powerCards.filter(card => card.includes('A'));
      if (aces.length > 0) {
        return aces[0];
      }
    }
    
    return powerCards[0]; // Default to first power card
  }

  findBestTarget(powerCard, gameState, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    
    if (powerCard.includes('Joker')) {
      // Joker can be used for any action - choose the most beneficial
      const hiddenCards = player.cards.filter(card => card === 'hidden');
      if (hiddenCards.length > 0) {
        return {
          action: 'peek',
          cardIndex: player.cards.indexOf('hidden'),
          reason: 'Using Joker to peek at hidden card'
        };
      } else {
        return {
          action: 'draw_two',
          reason: 'Using Joker to draw two cards'
        };
      }
    }
    
    if (powerCard.includes('A')) {
      // Ace is used to peek at hidden cards
      const hiddenIndex = player.cards.indexOf('hidden');
      if (hiddenIndex !== -1) {
        return {
          action: 'peek',
          cardIndex: hiddenIndex,
          reason: 'Using Ace to peek at hidden card'
        };
      }
    }
    
    return null;
  }

  // Get computer player data
  getPlayerData() {
    return {
      id: 'computer-player',
      username: this.username,
      isComputer: true
    };
  }
}

module.exports = { ComputerPlayer };
