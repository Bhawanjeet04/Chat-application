const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const reqRoutes = require('./routes/reqRoutes');
const chatRoutes = require('./routes/chatRoutes');
const User = require('./models/User');

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/requests', reqRoutes);
app.use('/api/chats', chatRoutes);

app.get('/', (req, res) => {
    res.send('Chat Application Backend API is online and waiting for requests.');
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true 
    }
});

server.listen(PORT, () => {
    console.log(`server listening on port : ${PORT}`);
});

const onlineUsers = new Map();
const inVideoCall = new Set();

app.set('io', io);
app.set('onlineUsers', onlineUsers);

io.on('connection', (socket) => {
  console.log(` A user connected: ${socket.id}`);
  
  socket.on('register_user', (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} is mapped to socket ${socket.id}`);
      io.emit('get_online_users', Array.from(onlineUsers.keys()));
    }
  });

  socket.on('send_connection_request', (data) => {
    const { senderUsername, recipientId } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      socket.to(recipientSocketId).emit('new_connection_request', {
        message: `${senderUsername} wants to connect with you!`,
        senderUsername
      });
      console.log(`Instant notification sent from ${senderUsername} to socket ${recipientSocketId}`);
    }
  });

  socket.on('disconnect', async() => {
    console.log(`A user disconnected: ${socket.id}`);
    
    if (socket.userId) inVideoCall.delete(socket.userId.toString());
    if (socket.recipientId) inVideoCall.delete(socket.recipientId.toString());

    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        inVideoCall.delete(userId.toString());
        onlineUsers.delete(userId);

        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
        break;
      }
    }
    io.emit('get_online_users', Array.from(onlineUsers.keys()));
  });

  socket.on('update_preserve_toggle', ({ recipientId, connectionId, preserveHistory }) => {
  console.log(`History toggle: ${preserveHistory} → connection ${connectionId} → user ${recipientId}`);
  const recipientSocketId = onlineUsers.get(recipientId);
  console.log(`Recipient socket: ${recipientSocketId}`);
  if (recipientSocketId) {
    io.to(recipientSocketId).emit('preserve_toggle_updated', {
      connectionId,
      preserveHistory
    });
  }
});

  socket.on('send_message', (data) => {
    const { recipientId } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      socket.to(recipientSocketId).emit('receive_message', data);
      console.log(` Message relayed to socket ${recipientSocketId}`);
    }
  });
  
  socket.on('call-user', ({ userToCall, signalData, from, name }) => {
    const recipientSocketId = onlineUsers.get(userToCall);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('incoming-call', {
        signal: signalData,
        from,
        name,
        callerId: from
      });
    }
  });

  socket.on('answer-call', ({ to, signal }) => {
    const recipientSocketId = onlineUsers.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('call-accepted', signal);
    }
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    const recipientSocketId = onlineUsers.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('ice-candidate', { candidate });
    }
  });

  socket.on('end-call', ({ to }) => {
    const recipientSocketId = onlineUsers.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('call-ended');
    }
  });
});