let currentMode = 'login';

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

// Initialize loading screen
window.addEventListener('load', () => {
    setTimeout(hideLoadingScreen, 800);
});

function switchTab(mode) {
    currentMode = mode;
    document.getElementById('tab-login').classList.toggle('active', mode === 'login');
    document.getElementById('tab-register').classList.toggle('active', mode === 'register');
    document.getElementById('submit-btn').textContent = mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
    document.getElementById('auth-message').textContent = '';
}

document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
document.getElementById('tab-register').addEventListener('click', () => switchTab('register'));

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const msgDiv = document.getElementById('auth-message');
    
    msgDiv.className = 'message';
    msgDiv.textContent = 'İşleniyor...';
    
    try {
        const endpoint = currentMode === 'login' ? '/api/login' : '/api/register';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            msgDiv.className = 'message success';
            msgDiv.textContent = data.message || 'Başarılı! Yönlendiriliyorsunuz...';
            sessionStorage.setItem('user', JSON.stringify(data.user));
            
            // Play success sound
            playSound('success');
            
            setTimeout(() => {
                showLoadingScreen();
                window.location.href = 'lobby.html';
            }, 1000);
        } else {
            msgDiv.className = 'message error';
            msgDiv.textContent = data.message || 'Bir hata oluştu.';
            playSound('error');
        }
    } catch (err) {
        msgDiv.className = 'message error';
        msgDiv.textContent = 'Sunucuya bağlanılamadı.';
        console.error(err);
        playSound('error');
    }
});

// Simple Sound System
function playSound(type) {
    // Audio context for modern browsers
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'success') {
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.4);
    } else if (type === 'error') {
        oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
    }
}

// Check if already logged in (optimistic check)
window.addEventListener('DOMContentLoaded', () => {
    const user = sessionStorage.getItem('user');
    if (user) {
        showLoadingScreen();
        window.location.href = 'lobby.html';
    }
});
