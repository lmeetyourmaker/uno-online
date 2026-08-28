const { createDeck, shuffleDeck, canPlayCard, getCardScore } = require('./deck');

class UnoGame {
  constructor(players) {
    this.players = players.map(p => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      hand: [],
      calledUno: false
    }));
    this.drawPile = shuffleDeck(createDeck());
    this.discardPile = [];
    this.currentPlayerIndex = 0;
    this.direction = 1;
    this.currentColor = null;
    this.topCard = null;
    this.status = 'playing';
    this.winner = null;
    this.pendingDraw = null;
  }

  start() {
    for (let i = 0; i < 7; i++) {
      for (const player of this.players) {
        player.hand.push(this.drawPile.pop());
      }
    }

    let initialCard = this.drawPile.pop();
    while (initialCard.value === 'wild4') {
      this.drawPile.unshift(initialCard);
      initialCard = this.drawPile.pop();
    }
    
    this.discardPile.push(initialCard);
    this.topCard = initialCard;
    this.currentColor = initialCard.color === 'wild' ? 'red' : initialCard.color;
    this.applyCardEffect(initialCard, true);
  }

  getStateForPlayer(playerId) {
    return {
      hand: this.players.find(p => p.id === playerId)?.hand || [],
      topCard: this.topCard,
      activePlayerId: this.players[this.currentPlayerIndex].id,
      direction: this.direction,
      currentColor: this.currentColor,
      players: this.players.map(p => ({
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        cardCount: p.hand.length
      })),
      drawPileCount: this.drawPile.length,
      canPlay: this.players[this.currentPlayerIndex].id === playerId,
      mustDraw: false,
      isYourTurn: this.players[this.currentPlayerIndex].id === playerId
    };
  }
  
  getCurrentPlayerId() {
    return this.players[this.currentPlayerIndex].id;
  }
  
  advanceTurn() {
    let nextIndex = this.currentPlayerIndex + this.direction;
    if (nextIndex >= this.players.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = this.players.length - 1;
    this.currentPlayerIndex = nextIndex;
  }

  isValidPlay(card, playerId) {
    if (this.players[this.currentPlayerIndex].id !== playerId) return false;
    return canPlayCard(card, this.topCard, this.currentColor);
  }

  reshuffleIfNeeded(amount) {
    if (this.drawPile.length < amount) {
      const top = this.discardPile.pop();
      this.drawPile = shuffleDeck([...this.discardPile]);
      this.discardPile = [top];
    }
  }

  drawCard(playerId) {
    if (this.players[this.currentPlayerIndex].id !== playerId) return { success: false, error: 'Sıra sizde değil' };
    
    this.reshuffleIfNeeded(1);
    const card = this.drawPile.pop();
    const player = this.players.find(p => p.id === playerId);
    player.hand.push(card);
    player.calledUno = false;
    this.advanceTurn();
    return { success: true, cards: [card], canPlayDrawn: false };
  }

  playCard(playerId, cardIndex, declaredColor) {
    if (this.players[this.currentPlayerIndex].id !== playerId) return { success: false, error: 'Sıra sizde değil' };

    const player = this.players.find(p => p.id === playerId);
    const card = player.hand[cardIndex];

    if (!card) return { success: false, error: 'Geçersiz kart' };
    if (!this.isValidPlay(card, playerId)) return { success: false, error: 'Bu kart oynanamaz' };
    if (card.type === 'wild' && !declaredColor) return { success: false, error: 'Renk seçilmedi' };

    player.hand.splice(cardIndex, 1);
    this.discardPile.push(card);
    this.topCard = card;
    this.currentColor = card.type === 'wild' ? declaredColor : card.color;
    player.calledUno = false;

    if (player.hand.length === 0) {
      this.status = 'finished';
      this.winner = player;
      return { success: true, effects: ['win'] };
    }

    this.applyCardEffect(card, false);
    if (card.value !== 'wild4') this.advanceTurn();
    
    return { success: true, effects: [] };
  }

  applyCardEffect(card, isFirstCard) {
    if (card.value === 'reverse') {
      this.direction *= -1;
      if (this.players.length === 2 && !isFirstCard) this.advanceTurn();
      // Tek kişilik modda reverse etkisiz
      if (this.players.length === 1 && !isFirstCard) this.advanceTurn();
    } else if (card.value === 'skip') {
      if (!isFirstCard) this.advanceTurn();
      // Tek kişilik modda skip etkisiz
      if (this.players.length === 1 && !isFirstCard) this.advanceTurn();
    } else if (card.value === 'draw2') {
      if (this.players.length === 1) {
        // Tek kişilik modda draw2 sadece sırayı geçer
        this.advanceTurn();
      } else {
        this.pendingDraw = { count: 2, type: 'draw2' };
        this.processDraw();
      }
    } else if (card.value === 'wild4' && !isFirstCard) {
      if (this.players.length === 1) {
        // Tek kişilik modda wild4 sadece sırayı geçer
        this.advanceTurn();
      } else {
        // +4 kartı otomatik olarak bir sonraki oyuncuya 4 kart çeker
        const targetIndex = this.getNextPlayerIndex();
        const targetPlayer = this.players[targetIndex];
        this.reshuffleIfNeeded(4);
        for (let i = 0; i < 4; i++) {
          targetPlayer.hand.push(this.drawPile.pop());
          targetPlayer.calledUno = false;
        }
        this.advanceTurn();
      }
    }
  }
  
  getNextPlayerIndex() {
    let nextIndex = this.currentPlayerIndex + this.direction;
    if (nextIndex >= this.players.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = this.players.length - 1;
    return nextIndex;
  }

  processDraw() {
     if (this.pendingDraw) {
        const targetIndex = this.getNextPlayerIndex();
        const targetPlayer = this.players[targetIndex];
        this.reshuffleIfNeeded(this.pendingDraw.count);
        for (let i = 0; i < this.pendingDraw.count; i++) {
           targetPlayer.hand.push(this.drawPile.pop());
           targetPlayer.calledUno = false;
        }
        this.advanceTurn();
        this.pendingDraw = null;
     }
  }

  callUno(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (player && player.hand.length === 1) {
      player.calledUno = true;
      return { success: true };
    }
    return { success: false, error: 'UNO diyemezsiniz' };
  }

  catchUno(catcherId, targetId) {
    const target = this.players.find(p => p.id === targetId);
    if (target && target.hand.length === 1 && !target.calledUno) {
      this.reshuffleIfNeeded(2);
      target.hand.push(this.drawPile.pop());
      target.hand.push(this.drawPile.pop());
      return { success: true, penalized: true };
    }
    return { success: false, penalized: false, error: 'Hedef oyuncu ceza almaya uygun değil' };
  }

  getScores() {
    return this.players.map(p => {
       let score = p.hand.reduce((acc, card) => acc + getCardScore(card), 0);
       return { playerId: p.id, username: p.username, score };
    });
  }
}

module.exports = UnoGame;
