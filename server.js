const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Redis session store for production
let sessionStore;
if (process.env.REDIS_URL) {
  const RedisStore = require('connect-redis').default;
  const { createClient } = require('redis');
  const redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.connect().catch(console.error);
  sessionStore = new RedisStore({ client: redisClient });
}

const { createRoom, joinRoom, leaveRoom, getRoom, setPlayerReady } = require('./game/room');
const UnoGame = require('./game/gameLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: process.env.ALLOWED_ORIGINS || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const USERS_FILE = path.join(__dirname, 'data', 'users.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'uno-secret-key-12345',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
};

if (sessionStore) {
  sessionConfig.store = sessionStore;
}

const sessionMiddleware = session(sessionConfig);

app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

function loadUsers() {
  if (fs.existsSync(USERS_FILE)) return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  return [];
}

function saveUsers(users) {
  if (!fs.existsSync(path.dirname(USERS_FILE))) {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: 'Kullanıcı adı ve şifre zorunludur' });

  let users = loadUsers();
  if (users.find(u => u.username === username)) return res.json({ success: false, message: 'Kullanıcı adı kullanımda' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: uuidv4(), username, password: hashedPassword, avatar: 'default.png', gamesPlayed: 0, gamesWon: 0 };
  users.push(newUser);
  saveUsers(users);

  req.session.userId = newUser.id;
  res.json({ success: true, message: 'Kayıt başarılı', user: { id: newUser.id, username: newUser.username, avatar: newUser.avatar } });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username);

  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user.id;
    res.json({ success: true, message: 'Giriş başarılı', user: { id: user.id, username: user.username, avatar: user.avatar } });
  } else {
    res.json({ success: false, message: 'Hatalı kullanıcı adı veya şifre' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/profile', (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'Oturum açık değil' });
  const user = loadUsers().find(u => u.id === req.session.userId);
  if (user) {
    res.json({ success: true, user: { id: user.id, username: user.username, avatar: user.avatar, gamesPlayed: user.gamesPlayed, gamesWon: user.gamesWon } });
  } else {
    res.json({ success: false, message: 'Kullanıcı bulunamadı' });
  }
});

app.put('/api/profile', (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'Oturum açık değil' });
  const { avatar } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.id === req.session.userId);
  
  if (user) {
    user.avatar = avatar;
    saveUsers(users);
    res.json({ success: true, user: { id: user.id, username: user.username, avatar: user.avatar } });
  } else {
    res.json({ success: false, message: 'Kullanıcı bulunamadı' });
  }
});

io.use((socket, next) => {
  const sess = socket.request.session;
  if (sess && sess.userId) {
    const user = loadUsers().find(u => u.id === sess.userId);
    if (user) {
      socket.user = { id: user.id, username: user.username, avatar: user.avatar };
      return next();
    }
  }
  next(new Error('Yetkisiz'));
});

io.on('connection', (socket) => {
  console.log(`Bağlandı: ${socket.id}, Kullanıcı: ${socket.user.username}`);
  let currentRoomCode = null;

  socket.on('create-room', (callback) => {
    const room = createRoom(socket.user);
    currentRoomCode = room.code;
    socket.join(room.code);
    callback({ success: true, roomCode: room.code });
  });

  socket.on('join-room', ({ roomCode }, callback) => {
    const room = joinRoom(roomCode, socket.user);
    if (room.error) return callback({ success: false, message: room.error });
    
    currentRoomCode = roomCode;
    socket.join(roomCode);
    io.to(roomCode).emit('room-update', { room });
    callback({ success: true, room });
    
    // If game is already in progress, send game state to reconnecting player
    if (room.status === 'playing' && room.gameState) {
      const state = room.gameState.getStateForPlayer(socket.user.id);
      socket.emit('game-state', state);
    }
  });
  
  socket.on('player-ready', () => {
    if (currentRoomCode) {
      const room = setPlayerReady(currentRoomCode, socket.user.id);
      io.to(currentRoomCode).emit('room-update', { room });
    }
  });

  socket.on('start-game', () => {
    const room = getRoom(currentRoomCode);
    if (room && room.hostId === socket.user.id && room.players.length >= 1) {
      room.status = 'playing';
      room.gameState = new UnoGame(room.players);
      room.gameState.start();
      io.to(currentRoomCode).emit('game-started', { status: 'started' });
      broadcastGameState(currentRoomCode);
    }
  });

  socket.on('play-card', ({ cardIndex, declaredColor }) => {
    const room = getRoom(currentRoomCode);
    if (room && room.gameState) {
      const game = room.gameState;
      const card = game.players.find(p => p.id === socket.user.id)?.hand[cardIndex];
      const result = game.playCard(socket.user.id, cardIndex, declaredColor);
      
      if (result.success) {
        io.to(currentRoomCode).emit('card-played', { playerId: socket.user.id, card, nextPlayerId: game.getCurrentPlayerId() });

        if (game.status === 'finished') handleGameOver(currentRoomCode, game);
        else broadcastGameState(currentRoomCode);
      } else {
        socket.emit('error', { message: result.error });
      }
    }
  });

  socket.on('draw-card', () => {
    const room = getRoom(currentRoomCode);
    if (room && room.gameState) {
       const result = room.gameState.drawCard(socket.user.id);
       if (result.success) {
           socket.emit('cards-drawn', { playerId: socket.user.id, count: 1, cards: result.cards });
           socket.to(currentRoomCode).emit('cards-drawn', { playerId: socket.user.id, count: 1 });
           broadcastGameState(currentRoomCode);
       } else {
           socket.emit('error', { message: result.error });
       }
    }
  });

  socket.on('call-uno', () => {
    const room = getRoom(currentRoomCode);
    if (room && room.gameState) {
       const res = room.gameState.callUno(socket.user.id);
       if (res.success) io.to(currentRoomCode).emit('uno-called', { playerId: socket.user.id });
       else socket.emit('error', { message: res.error });
    }
  });
  
  socket.on('catch-uno', ({ targetPlayerId }) => {
     const room = getRoom(currentRoomCode);
     if (room && room.gameState) {
        const res = room.gameState.catchUno(socket.user.id, targetPlayerId);
        if (res.success && res.penalized) {
            io.to(currentRoomCode).emit('uno-penalty', { playerId: targetPlayerId });
            broadcastGameState(currentRoomCode);
        } else {
             socket.emit('error', { message: res.error });
        }
     }
  });

  socket.on('leave-room', (callback) => {
    handleLeaveRoom(socket, currentRoomCode);
    currentRoomCode = null;
    if (callback) callback({ success: true });
  });

  socket.on('disconnect', () => {
    handleLeaveRoom(socket, currentRoomCode);
  });
});

function handleLeaveRoom(socket, roomCode) {
  if (roomCode) {
    const room = getRoom(roomCode);
    // Don't remove player during an active game (they might be reconnecting via page navigation)
    if (room && room.status === 'playing') {
      return;
    }
    const updatedRoom = leaveRoom(roomCode, socket.user.id);
    socket.leave(roomCode);
    io.to(roomCode).emit('player-disconnected', { playerId: socket.user.id, username: socket.user.username });
    if (updatedRoom) io.to(roomCode).emit('room-update', { room: updatedRoom });
  }
}

function broadcastGameState(roomCode) {
  const room = getRoom(roomCode);
  if (room && room.gameState) {
    const sockets = io.sockets.adapter.rooms.get(roomCode);
    if (sockets) {
      for (const socketId of sockets) {
        const sock = io.sockets.sockets.get(socketId);
        if (sock && sock.user) {
          const state = room.gameState.getStateForPlayer(sock.user.id);
          sock.emit('game-state', state);
        }
      }
    }
  }
}

function handleGameOver(roomCode, game) {
    const scores = game.getScores();
    io.to(roomCode).emit('game-over', { winnerId: game.winner.id, winnerName: game.winner.username, scores });
    
    let users = loadUsers();
    game.players.forEach(p => {
        let u = users.find(user => user.id === p.id);
        if(u) {
            u.gamesPlayed++;
            if(p.id === game.winner.id) u.gamesWon++;
        }
    });
    saveUsers(users);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
