const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const roomStates = new Map();
const roomUsers = new Map(); // Track users in each room

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Client ${socket.id} joined room ${roomId}`);
    
    // Update user count
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Set());
    }
    roomUsers.get(roomId).add(socket.id);
    
    // Send current state and user count
    const currentState = roomStates.get(roomId);
    if (currentState) {
      socket.emit('sync-code', currentState);
    }
    
    io.to(roomId).emit('user-count', roomUsers.get(roomId).size);
  });

  socket.on('code-update', ({ roomId, code }) => {
    console.log(`Code update in room ${roomId}`);
    roomStates.set(roomId, code);
    socket.to(roomId).emit('code-update', code);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Update user counts for all rooms this socket was in
    roomUsers.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        io.to(roomId).emit('user-count', users.size);
        
        // Clean up empty rooms
        if (users.size === 0) {
          roomUsers.delete(roomId);
          roomStates.delete(roomId);
        }
      }
    });
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
