const { v4: uuidv4 } = require('uuid');

const colors = ['red', 'blue', 'green', 'yellow'];

function getCardScore(card) {
  if (card.type === 'number') return parseInt(card.value);
  if (card.type === 'action') return 20;
  if (card.type === 'wild') return 50;
  return 0;
}

function createDeck() {
  let deck = [];
  
  for (const color of colors) {
    deck.push({ id: uuidv4(), color, value: '0', type: 'number', points: 0 });
    
    for (let i = 1; i <= 9; i++) {
      deck.push({ id: uuidv4(), color, value: i.toString(), type: 'number', points: i });
      deck.push({ id: uuidv4(), color, value: i.toString(), type: 'number', points: i });
    }
    
    for (const val of ['skip', 'reverse', 'draw2']) {
      deck.push({ id: uuidv4(), color, value: val, type: 'action', points: 20 });
      deck.push({ id: uuidv4(), color, value: val, type: 'action', points: 20 });
    }
  }
  
  for (let i = 0; i < 4; i++) {
    deck.push({ id: uuidv4(), color: 'wild', value: 'wild', type: 'wild', points: 50 });
    deck.push({ id: uuidv4(), color: 'wild', value: 'wild4', type: 'wild', points: 50 });
  }
  
  return deck;
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function canPlayCard(card, topCard, currentColor) {
  if (card.type === 'wild') return true;
  if (card.color === currentColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

module.exports = {
  createDeck,
  shuffleDeck,
  canPlayCard,
  getCardScore
};
