let socket;
let currentUser;
let currentRoom = null;
let sfxVolume = 70;

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

// Simple Sound System
function playSound(type) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    const masterGainNode = audioCtx.createGain();
    masterGainNode.connect(audioCtx.destination);
    
    if (type === 'success') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(masterGainNode);
        
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.4);
    } else if (type === 'error') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(masterGainNode);
        
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.setValueAtTime(150, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'click') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(masterGainNode);
        
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'card') {
        // Enhanced card swishing sound for lobby
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
        
        const oscillator = audioCtx.createOscillator();
        oscillator.type = 'triangle';
        const gainNode = audioCtx.createGain();
        
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);
        
        gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(masterGainNode);
        
        const shimmerOsc = audioCtx.createOscillator();
        shimmerOsc.type = 'sine';
        const shimmerGain = audioCtx.createGain();
        
        shimmerOsc.frequency.setValueAtTime(4000, audioCtx.currentTime);
        shimmerOsc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.05);
        
        shimmerGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        shimmerGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        
        shimmerOsc.connect(shimmerGain);
        shimmerGain.connect(masterGainNode);
        
        noiseSource.start(audioCtx.currentTime);
        oscillator.start(audioCtx.currentTime);
        shimmerOsc.start(audioCtx.currentTime);
        
        noiseSource.stop(audioCtx.currentTime + 0.15);
        oscillator.stop(audioCtx.currentTime + 0.1);
        shimmerOsc.stop(audioCtx.currentTime + 0.05);
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    try {
        const response = await fetch('/api/profile');
        const data = await response.json();
        if (!data.success) {
            showLoadingScreen();
            window.location.href = 'index.html';
            return;
        }
        currentUser = data.user;
        sessionStorage.setItem('user', JSON.stringify(currentUser));
        
        document.getElementById('user-name').textContent = currentUser.username;
        document.getElementById('user-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
        
        hideLoadingScreen();
        initSocket();
    } catch (err) {
        showLoadingScreen();
        window.location.href = 'index.html';
    }
});

function initSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Bağlanıldı:', socket.id);
        playSound('success');
    });

    socket.on('room-update', (data) => {
        currentRoom = data.room;
        updateRoomUI();
    });

    socket.on('game-started', (data) => {
        sessionStorage.setItem('roomCode', currentRoom.code);
        playSound('success');
        showLoadingScreen();
        window.location.href = 'game.html';
    });

    socket.on('error', (data) => {
        alert('Hata: ' + data.message);
        playSound('error');
    });
}

document.getElementById('logout-btn').addEventListener('click', async () => {
    playSound('click');
    await fetch('/api/logout', { method: 'POST' });
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('roomCode');
    showLoadingScreen();
    window.location.href = 'index.html';
});

document.getElementById('create-room-btn').addEventListener('click', () => {
    playSound('card');
    socket.emit('create-room', (res) => {
        if (res.success) {
            showWaitingRoom(res.roomCode);
            playSound('success');
        } else {
            alert('Oda oluşturulamadı.');
            playSound('error');
        }
    });
});

document.getElementById('join-room-btn').addEventListener('click', () => {
    playSound('card');
    const code = document.getElementById('join-room-code').value.trim().toUpperCase();
    if (!code) return;
    
    socket.emit('join-room', { roomCode: code }, (res) => {
        if (res.success) {
            showWaitingRoom(res.room.code);
            playSound('success');
        } else {
            alert('Odaya katılınamadı: ' + (res.message || 'Geçersiz kod'));
            playSound('error');
        }
    });
});

document.getElementById('leave-room-btn').addEventListener('click', () => {
    playSound('click');
    socket.emit('leave-room', (res) => {
        if (res.success) {
            currentRoom = null;
            document.getElementById('room-selection').style.display = 'flex';
            document.getElementById('waiting-room').style.display = 'none';
            playSound('success');
        }
    });
});

document.getElementById('ready-btn').addEventListener('click', () => {
    playSound('click');
    socket.emit('player-ready');
});

document.getElementById('start-game-btn').addEventListener('click', () => {
    playSound('click');
    socket.emit('start-game');
});

document.getElementById('copy-code-btn').addEventListener('click', () => {
    playSound('click');
    const code = document.getElementById('room-code-text').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copy-code-btn');
        btn.textContent = 'Kopyalandı!';
        setTimeout(() => btn.textContent = 'Kopyala', 2000);
        playSound('success');
    });
});

// Navigation Buttons
document.getElementById('nav-join').addEventListener('click', () => {
    playSound('click');
    // Show room selection panel focused on join
    document.getElementById('room-selection').style.display = 'flex';
    document.getElementById('settings-panel').style.display = 'none';
    document.getElementById('waiting-room').style.display = 'none';
    document.getElementById('welcome-panel').style.display = 'none';
    
    // Update active states
    document.querySelectorAll('.nav-button-large').forEach(btn => btn.classList.remove('active'));
    document.getElementById('nav-join').classList.add('active');
});

document.getElementById('nav-create').addEventListener('click', () => {
    playSound('click');
    // Show room selection panel focused on create
    document.getElementById('room-selection').style.display = 'flex';
    document.getElementById('settings-panel').style.display = 'none';
    document.getElementById('waiting-room').style.display = 'none';
    document.getElementById('welcome-panel').style.display = 'none';
    
    // Update active states
    document.querySelectorAll('.nav-button-large').forEach(btn => btn.classList.remove('active'));
    document.getElementById('nav-create').classList.add('active');
});

document.getElementById('nav-settings').addEventListener('click', () => {
    playSound('click');
    // Show settings panel
    document.getElementById('room-selection').style.display = 'none';
    document.getElementById('settings-panel').style.display = 'block';
    document.getElementById('waiting-room').style.display = 'none';
    document.getElementById('welcome-panel').style.display = 'none';
    
    // Update active states
    document.querySelectorAll('.nav-button-large').forEach(btn => btn.classList.remove('active'));
    document.getElementById('nav-settings').classList.add('active');
});

// SFX Volume Control
document.getElementById('sfx-volume').addEventListener('input', (e) => {
    sfxVolume = e.target.value;
    document.getElementById('sfx-volume-value').textContent = sfxVolume + '%';
});

// Close Settings Button
document.getElementById('close-settings').addEventListener('click', () => {
    playSound('click');
    document.getElementById('settings-panel').style.display = 'none';
    document.getElementById('welcome-panel').style.display = 'block';
    
    // Remove active class from settings button
    document.getElementById('nav-settings').classList.remove('active');
});

// Initialize welcome panel
window.addEventListener('DOMContentLoaded', () => {
    // Show welcome panel immediately on load
    document.getElementById('welcome-panel').style.display = 'block';
});

function switchPanel(panel) {
    // Reset all nav buttons
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    
    // Hide all panels
    document.getElementById('room-selection').style.display = 'none';
    document.getElementById('waiting-room').style.display = 'none';
    document.getElementById('settings-panel').style.display = 'none';
    
    // Show selected panel and activate button
    switch(panel) {
        case 'join':
            document.getElementById('nav-join').classList.add('active');
            document.getElementById('room-selection').style.display = 'flex';
            break;
        case 'create':
            document.getElementById('nav-create').classList.add('active');
            document.getElementById('room-selection').style.display = 'flex';
            break;
        case 'settings':
            document.getElementById('nav-settings').classList.add('active');
            document.getElementById('settings-panel').style.display = 'block';
            break;
    }
}

function showWaitingRoom(code) {
    document.getElementById('room-selection').style.display = 'none';
    document.getElementById('waiting-room').style.display = 'block';
    document.getElementById('room-code-text').textContent = code;
}

function updateRoomUI() {
    if (!currentRoom) return;
    
    const list = document.getElementById('player-list');
    list.innerHTML = '';
    
    let allReady = true;
    let isHost = currentRoom.hostId === currentUser.id;

    currentRoom.players.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="avatar" style="width:30px;height:30px;font-size:0.9rem;margin-right:10px;">${p.username.charAt(0).toUpperCase()}</div>
            <span>${p.username} ${p.id === currentRoom.hostId ? '👑' : ''}</span>
            <div class="ready-status ${p.ready ? 'ready' : ''}"></div>
        `;
        list.appendChild(li);
        
        if (!p.ready) allReady = false;
        
        if (p.id === currentUser.id) {
            const readyBtn = document.getElementById('ready-btn');
            readyBtn.textContent = p.ready ? '❌ Hazır Değilim' : '✅ Hazırım';
            readyBtn.className = p.ready ? 'btn-outline' : 'btn-secondary';
        }
    });

    const startBtn = document.getElementById('start-game-btn');
    if (isHost) {
        startBtn.style.display = 'inline-block';
        startBtn.disabled = !allReady || currentRoom.players.length < 2;
        startBtn.style.opacity = startBtn.disabled ? '0.5' : '1';
    } else {
        startBtn.style.display = 'none';
    }
}
