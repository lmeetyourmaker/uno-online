let socket;
let currentUser;
let gameState = null;
let pendingWildCardIndex = -1;
let isFirstRender = true;
let turnTimer = null;
let timeRemaining = 30;

// Sound Settings
let soundSettings = {
    masterVolume: 0.5,
    sfxVolume: 0.7,
    autoUno: true,
    showTimer: true,
    particleEffects: true
};

// Loading Screen Functions
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        loadingScreen.classList.remove('hidden');
    }
}

// Enhanced Sound System
function playSound(type) {
    if (soundSettings.masterVolume === 0) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    const masterGainNode = audioCtx.createGain();
    masterGainNode.connect(audioCtx.destination);
    
    masterGainNode.gain.setValueAtTime(soundSettings.masterVolume * soundSettings.sfxVolume, audioCtx.currentTime);
    
    switch(type) {
        case 'card':
            // Create a more realistic card swishing sound
            // 1. Noise component for paper friction
            const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.15, audioCtx.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseData.length; i++) {
                noiseData[i] = Math.random() * 2 - 1;
            }
            
            const noiseSource = audioCtx.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            
            const noiseFilter = audioCtx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(2000, audioCtx.currentTime);
            noiseFilter.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.15);
            noiseFilter.Q.setValueAtTime(1, audioCtx.currentTime);
            
            const noiseGain = audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(masterGainNode);
            
            // 2. Tonal component for card slap
            const oscillator = audioCtx.createOscillator();
            oscillator.type = 'triangle';
            const gainNode = audioCtx.createGain();
            
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);
            
            gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            
            oscillator.connect(gainNode);
            gainNode.connect(masterGainNode);
            
            // 3. High frequency shimmer
            const shimmerOsc = audioCtx.createOscillator();
            shimmerOsc.type = 'sine';
            const shimmerGain = audioCtx.createGain();
            
            shimmerOsc.frequency.setValueAtTime(4000, audioCtx.currentTime);
            shimmerOsc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.05);
            
            shimmerGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            shimmerGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
            
            shimmerOsc.connect(shimmerGain);
            shimmerGain.connect(masterGainNode);
            
            // Start all sounds
            noiseSource.start(audioCtx.currentTime);
            oscillator.start(audioCtx.currentTime);
            shimmerOsc.start(audioCtx.currentTime);
            
            noiseSource.stop(audioCtx.currentTime + 0.15);
            oscillator.stop(audioCtx.currentTime + 0.1);
            shimmerOsc.stop(audioCtx.currentTime + 0.05);
            break;
        case 'draw':
            const drawOsc = audioCtx.createOscillator();
            const drawGain = audioCtx.createGain();
            drawOsc.connect(drawGain);
            drawGain.connect(masterGainNode);
            
            drawOsc.frequency.setValueAtTime(300, audioCtx.currentTime);
            drawOsc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.15);
            drawGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            drawGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            drawOsc.start(audioCtx.currentTime);
            drawOsc.stop(audioCtx.currentTime + 0.2);
            break;
        case 'uno':
            const unoOsc = audioCtx.createOscillator();
            const unoGain = audioCtx.createGain();
            unoOsc.connect(unoGain);
            unoGain.connect(masterGainNode);
            
            unoOsc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
            unoOsc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
            unoOsc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
            unoOsc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3);
            unoGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            unoGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            unoOsc.start(audioCtx.currentTime);
            unoOsc.stop(audioCtx.currentTime + 0.5);
            break;
        case 'wild':
            const wildOsc = audioCtx.createOscillator();
            const wildGain = audioCtx.createGain();
            wildOsc.connect(wildGain);
            wildGain.connect(masterGainNode);
            
            wildOsc.frequency.setValueAtTime(400, audioCtx.currentTime);
            wildOsc.frequency.setValueAtTime(500, audioCtx.currentTime + 0.1);
            wildOsc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.2);
            wildOsc.frequency.setValueAtTime(700, audioCtx.currentTime + 0.3);
            wildGain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            wildGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            wildOsc.start(audioCtx.currentTime);
            wildOsc.stop(audioCtx.currentTime + 0.4);
            break;
        case 'win':
            const winOsc = audioCtx.createOscillator();
            const winGain = audioCtx.createGain();
            winOsc.connect(winGain);
            winGain.connect(masterGainNode);
            
            const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 523.25];
            notes.forEach((freq, i) => {
                winOsc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.12);
            });
            winGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            winGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.9);
            winOsc.start(audioCtx.currentTime);
            winOsc.stop(audioCtx.currentTime + 0.9);
            break;
        case 'error':
            const errorOsc = audioCtx.createOscillator();
            const errorGain = audioCtx.createGain();
            errorOsc.connect(errorGain);
            errorGain.connect(masterGainNode);
            
            errorOsc.frequency.setValueAtTime(200, audioCtx.currentTime);
            errorOsc.frequency.setValueAtTime(150, audioCtx.currentTime + 0.1);
            errorGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            errorGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            errorOsc.start(audioCtx.currentTime);
            errorOsc.stop(audioCtx.currentTime + 0.3);
            break;
        case 'turn':
            const turnOsc = audioCtx.createOscillator();
            const turnGain = audioCtx.createGain();
            turnOsc.connect(turnGain);
            turnGain.connect(masterGainNode);
            
            turnOsc.frequency.setValueAtTime(440, audioCtx.currentTime);
            turnGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            turnGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            turnOsc.start(audioCtx.currentTime);
            turnOsc.stop(audioCtx.currentTime + 0.1);
            break;
    }
}

// Particle Effects System
function createParticles(x, y, color, count = 10) {
    if (!soundSettings.particleEffects) return;
    
    const container = document.getElementById('game-table');
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.width = Math.random() * 8 + 4 + 'px';
        particle.style.height = particle.style.width;
        particle.style.background = color;
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 100 + 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');
        
        container.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1000);
    }
}

function createConfetti() {
    const colors = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#ff6b81', '#7bed9f'];
    const container = document.body;
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = Math.random() * 2 + 2 + 's';
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            container.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 4000);
        }, i * 50);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/profile');
        const data = await response.json();
        if (!data.success) {
            showLoadingScreen();
            window.location.href = 'index.html';
            return;
        }
        currentUser = data.user;
        document.getElementById('my-name').textContent = currentUser.username;
        initSocket();
    } catch (err) {
        showLoadingScreen();
        window.location.href = 'index.html';
    }
});

function initSocket() {
    socket = io();

    socket.on('connect', () => {
        const roomCode = sessionStorage.getItem('roomCode');
        if (roomCode) {
            socket.emit('join-room', { roomCode }, (res) => {
                if (!res.success) {
                    showLoadingScreen();
                    window.location.href = 'lobby.html';
                } else {
                    hideLoadingScreen();
                }
            });
        } else {
            showLoadingScreen();
            window.location.href = 'lobby.html';
        }
    });

    socket.on('game-state', (state) => {
        const previousTurn = gameState ? gameState.activePlayerId : null;
        gameState = state;
        renderGame();
        
        // Play turn change sound
        if (previousTurn && previousTurn !== state.activePlayerId) {
            playSound('turn');
        }
        
        if (isFirstRender) {
            isFirstRender = false;
        }
    });

    socket.on('card-played', (data) => {
        logMessage(`${getPlayerName(data.playerId)} bir kart oynadı.`);
        playSound('card');
        
        // Create particle effect at center
        const centerArea = document.getElementById('center-area');
        const rect = centerArea.getBoundingClientRect();
        createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#ffd700', 15);
    });

    socket.on('cards-drawn', (data) => {
        logMessage(`${getPlayerName(data.playerId)} ${data.count} kart çekti.`);
        playSound('draw');
    });

    socket.on('uno-called', (data) => {
        logMessage(`📢 ${getPlayerName(data.playerId)} UNO dedi!`);
        playSound('uno');
        
        // Special effect for UNO call
        const myArea = document.getElementById('my-area');
        const rect = myArea.getBoundingClientRect();
        createParticles(rect.left + rect.width / 2, rect.top, '#ff4757', 20);
    });

    socket.on('uno-penalty', (data) => {
        logMessage(`⚠️ ${getPlayerName(data.playerId)} UNO demediği için ceza aldı!`);
        playSound('error');
    });

    socket.on('game-over', (data) => {
        document.getElementById('winner-text').textContent = `🏆 ${data.winnerName} Kazandı!`;
        const tbody = document.querySelector('#score-list tbody');
        tbody.innerHTML = '';
        data.scores.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${s.username}</td><td>${s.score}</td>`;
            tbody.appendChild(tr);
        });
        document.getElementById('game-over-modal').style.display = 'flex';
        playSound('win');
        createConfetti();
    });

    socket.on('player-disconnected', (data) => {
        logMessage(`🔌 ${data.username} oyundan ayrıldı.`);
        playSound('error');
    });

    socket.on('error', (data) => {
        logMessage(`❗ ${data.message}`);
        playSound('error');
    });
}

// ==================== RENDERING ====================

function renderGame() {
    if (!gameState) return;
    renderInfoBar();
    renderTopCard();
    renderHand();
    renderOpponents();
    renderActionButtons();
}

function renderInfoBar() {
    const directionIndicator = document.getElementById('direction-indicator');
    directionIndicator.textContent = gameState.direction === 1 ? '↻' : '↺';
    directionIndicator.classList.toggle('reverse', gameState.direction === -1);

    const colorBox = document.getElementById('current-color-box');
    const colorMap = { 
        red: '#ff6b6b', 
        blue: '#4facfe', 
        green: '#43e97b', 
        yellow: '#ffd700', 
        wild: '#ffffff' 
    };
    colorBox.style.backgroundColor = colorMap[gameState.currentColor] || 'transparent';
    colorBox.style.boxShadow = `0 0 15px ${colorMap[gameState.currentColor] || '#ffffff'}`;

    const isMyTurn = gameState.isYourTurn;
    document.getElementById('turn-indicator').style.display = isMyTurn ? 'inline' : 'none';

    const turnDisplay = document.getElementById('turn-display');
    const timerDisplay = document.getElementById('timer-display');
    
    if (isMyTurn) {
        turnDisplay.textContent = '🔥 Sıra Sende!';
        turnDisplay.style.color = '#2ed573';
        timerDisplay.style.display = 'block';
        startTurnTimer();
    } else {
        const active = gameState.players.find(p => p.id === gameState.activePlayerId);
        turnDisplay.textContent = `Sıra: ${active ? active.username : '...'}`;
        turnDisplay.style.color = '#ffa502';
        timerDisplay.style.display = 'none';
        stopTurnTimer();
    }
}

function startTurnTimer() {
    stopTurnTimer();
    timeRemaining = 30;
    document.getElementById('time-remaining').textContent = timeRemaining;
    
    turnTimer = setInterval(() => {
        timeRemaining--;
        document.getElementById('time-remaining').textContent = timeRemaining;
        
        if (timeRemaining <= 0) {
            stopTurnTimer();
            // Auto draw card when time runs out
            if (gameState && gameState.isYourTurn) {
                socket.emit('draw-card');
                playSound('draw');
            }
        }
    }, 1000);
}

function stopTurnTimer() {
    if (turnTimer) {
        clearInterval(turnTimer);
        turnTimer = null;
    }
}

function renderTopCard() {
    const container = document.getElementById('discard-pile');
    container.innerHTML = '';
    if (gameState.topCard) {
        const cardEl = createCardElement(gameState.topCard, false);
        cardEl.style.position = 'relative';
        cardEl.style.transform = 'none';
        cardEl.style.cursor = 'default';
        cardEl.classList.add('card-play-anim');
        container.appendChild(cardEl);
    }
}

function renderHand() {
    const handDiv = document.getElementById('my-hand');
    handDiv.innerHTML = '';

    const total = gameState.hand.length;
    const maxSpread = 30;
    const spread = Math.min(maxSpread, total * 3.5);
    const step = total > 1 ? (spread * 2) / (total - 1) : 0;

    gameState.hand.forEach((card, index) => {
        const cardEl = createCardElement(card, gameState.isYourTurn && gameState.canPlay);
        const rotation = total > 1 ? (-spread + step * index) : 0;
        const lift = -Math.abs(rotation) * 0.4;
        cardEl.style.transform = `rotate(${rotation}deg) translateY(${lift}px)`;

        cardEl.addEventListener('click', () => {
            if (!gameState.isYourTurn || !gameState.canPlay) return;

            if (card.color === 'wild') {
                pendingWildCardIndex = index;
                document.getElementById('color-picker-modal').style.display = 'flex';
                playSound('wild');
            } else {
                socket.emit('play-card', { cardIndex: index });
                playSound('card');
                
                // Particle effect on card click
                const rect = cardEl.getBoundingClientRect();
                createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#ffd700', 8);
            }
        });

        // Deal animation on first render
        if (isFirstRender) {
            cardEl.classList.add('deal-anim');
            cardEl.style.setProperty('--deal-x', '0px');
            cardEl.style.setProperty('--deal-y', '-350px');
            cardEl.style.animationDelay = `${index * 0.1}s`;
        }

        handDiv.appendChild(cardEl);
    });
}

function renderOpponents() {
    const slots = ['opponent-top', 'opponent-left', 'opponent-right'];

    // Get opponents in clockwise order relative to me
    const meIdx = gameState.players.findIndex(p => p.id === currentUser.id);
    const opponents = [];
    for (let i = 1; i < gameState.players.length; i++) {
        opponents.push(gameState.players[(meIdx + i) % gameState.players.length]);
    }

    // Determine which slots to use
    let assignedSlots;
    if (opponents.length === 1) assignedSlots = ['opponent-top'];
    else if (opponents.length === 2) assignedSlots = ['opponent-left', 'opponent-right'];
    else assignedSlots = slots;

    // Clear all slots first
    slots.forEach(slotId => {
        const slot = document.getElementById(slotId);
        slot.querySelector('.opponent-info').innerHTML = '';
        slot.querySelector('.opponent-hand').innerHTML = '';
        slot.style.display = 'none';
    });

    opponents.forEach((opp, i) => {
        const slotId = assignedSlots[i];
        if (!slotId) return;
        const slot = document.getElementById(slotId);
        slot.style.display = 'flex';

        const isActive = opp.id === gameState.activePlayerId;

        // Info badge
        slot.querySelector('.opponent-info').innerHTML = `
            <div class="opponent-name-badge ${isActive ? 'active-turn' : ''}">
                <div class="opponent-avatar">${opp.username.charAt(0).toUpperCase()}</div>
                <span>${opp.username}</span>
                <span class="opponent-card-count">${opp.cardCount} 🃏</span>
            </div>
        `;

        // Mini cards
        const handDiv = slot.querySelector('.opponent-hand');
        handDiv.innerHTML = '';
        const maxCards = Math.min(opp.cardCount, 12);
        for (let j = 0; j < maxCards; j++) {
            const mc = document.createElement('div');
            mc.className = 'mini-card';
            if (isFirstRender) {
                mc.classList.add('deal-anim');
                mc.style.setProperty('--deal-x', '0px');
                mc.style.setProperty('--deal-y', '250px');
                mc.style.animationDelay = `${j * 0.08}s`;
            }
            handDiv.appendChild(mc);
        }
    });
}

function renderActionButtons() {
    const unoBtn = document.getElementById('uno-btn');
    unoBtn.style.display =
        (gameState.hand.length === 2 && gameState.isYourTurn) ? 'block' : 'none';

    const someoneHasOne = gameState.players.some(
        p => p.id !== currentUser.id && p.cardCount === 1
    );
    document.getElementById('catch-btn').style.display = someoneHasOne ? 'block' : 'none';
}

function createCardElement(card, checkPlayable) {
    const div = document.createElement('div');
    div.className = 'game-card';
    div.dataset.color = card.color;

    let displayValue = card.value;
    if (card.value === 'skip') displayValue = '⊘';
    else if (card.value === 'reverse') displayValue = '↺';
    else if (card.value === 'draw2') displayValue = '+2';
    else if (card.value === 'wild') displayValue = '★';
    else if (card.value === 'wild4') displayValue = '+4';

    div.innerHTML = `
        <div class="card-oval">
            <span class="card-text">${displayValue}</span>
        </div>
    `;

    if (checkPlayable) {
        const top = gameState.topCard;
        const colorMatch = card.color === gameState.currentColor || card.color === 'wild';
        const valueMatch = top && card.value === top.value;
        if (colorMatch || valueMatch) {
            div.classList.add('playable');
        }
    }

    return div;
}

// ==================== EVENT HANDLERS ====================

document.getElementById('draw-pile').addEventListener('click', () => {
    if (gameState && gameState.isYourTurn) {
        socket.emit('draw-card');
        playSound('draw');
        
        // Particle effect
        const drawPile = document.getElementById('draw-pile');
        const rect = drawPile.getBoundingClientRect();
        createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#2ed573', 12);
    }
});

document.getElementById('uno-btn').addEventListener('click', () => {
    socket.emit('call-uno');
    document.getElementById('uno-btn').style.display = 'none';
    playSound('uno');
    
    // Special UNO button effect
    const btn = document.getElementById('uno-btn');
    const rect = btn.getBoundingClientRect();
    createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#ff4757', 25);
});

document.getElementById('catch-btn').addEventListener('click', () => {
    const target = gameState.players.find(
        p => p.id !== currentUser.id && p.cardCount === 1
    );
    if (target) {
        socket.emit('catch-uno', { targetPlayerId: target.id });
        playSound('card');
    }
});

document.querySelectorAll('.color-circle').forEach(circle => {
    circle.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        document.getElementById('color-picker-modal').style.display = 'none';
        if (pendingWildCardIndex >= 0) {
            socket.emit('play-card', { cardIndex: pendingWildCardIndex, declaredColor: color });
            playSound('wild');
            pendingWildCardIndex = -1;
            
            // Particle effect for color selection
            const rect = e.target.getBoundingClientRect();
            const colorMap = { red: '#ff4757', blue: '#1e90ff', green: '#2ed573', yellow: '#ffa502' };
            createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, colorMap[color], 15);
        }
    });
});

// Settings Modal
document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('settings-modal').style.display = 'flex';
    playSound('turn');
});

document.getElementById('close-settings-btn').addEventListener('click', () => {
    document.getElementById('settings-modal').style.display = 'none';
    playSound('turn');
});

// Volume Controls
document.getElementById('master-volume').addEventListener('input', (e) => {
    soundSettings.masterVolume = e.target.value / 100;
    document.getElementById('master-volume-value').textContent = e.target.value + '%';
});

document.getElementById('sfx-volume').addEventListener('input', (e) => {
    soundSettings.sfxVolume = e.target.value / 100;
    document.getElementById('sfx-volume-value').textContent = e.target.value + '%';
});

// Game Settings
document.getElementById('auto-uno').addEventListener('change', (e) => {
    soundSettings.autoUno = e.target.checked;
});

document.getElementById('show-timer').addEventListener('change', (e) => {
    soundSettings.showTimer = e.target.checked;
    document.getElementById('timer-display').style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('particle-effects').addEventListener('change', (e) => {
    soundSettings.particleEffects = e.target.checked;
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.getElementById('return-lobby-btn').addEventListener('click', () => {
    playSound('click');
    showLoadingScreen();
    window.location.href = 'lobby.html';
});

// ==================== UTILS ====================

function logMessage(msg) {
    const log = document.getElementById('game-log');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = msg;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
    // Keep only last 25 messages
    while (log.children.length > 25) log.removeChild(log.firstChild);
}

function getPlayerName(id) {
    if (id === currentUser.id) return 'Sen';
    const p = gameState.players.find(x => x.id === id);
    return p ? p.username : 'Bilinmeyen';
}