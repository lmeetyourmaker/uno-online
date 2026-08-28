const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createRoom(hostPlayer) {
  const code = generateRoomCode();
  const room = {
    code,
    players: [{ ...hostPlayer, ready: false }],
    hostId: hostPlayer.id,
    status: 'waiting',
    gameState: null
  };
  rooms.set(code, room);
  return room;
}

function joinRoom(code, player) {
  const room = rooms.get(code);
  if (!room) return { error: 'Oda bulunamadı' };
  
  // Allow reconnect if the player is already in the room (even during a game)
  const existingPlayer = room.players.find(p => p.id === player.id);
  if (existingPlayer) {
    return room;
  }
  
  if (room.status !== 'waiting') return { error: 'Oyun zaten başladı' };
  if (room.players.length >= 4) return { error: 'Oda dolu' };
  
  room.players.push({ ...player, ready: false });
  return room;
}

function leaveRoom(code, playerId) {
  const room = rooms.get(code);
  if (!room) return null;
  
  room.players = room.players.filter(p => p.id !== playerId);
  if (room.players.length === 0) {
    rooms.delete(code);
    return null;
  }
  
  if (room.hostId === playerId) {
    room.hostId = room.players[0].id;
  }
  return room;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function setPlayerReady(code, playerId) {
  const room = rooms.get(code);
  if (room) {
    const player = room.players.find(p => p.id === playerId);
    if (player) player.ready = true;
  }
  return room;
}

module.exports = {
  rooms,
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  setPlayerReady,
  generateRoomCode
};
