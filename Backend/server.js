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

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

// 💡 FIX 1: Cleaned up duplicates & placed CORS at the absolute top of the middleware stack
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true // 💡 FIX 2: Changed "Credentials" to lowercase "credentials" to enable cookie passage!
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Database Hook
connectDB();

// API Router Mappings
app.use('/api/auth', authRoutes);
app.use('/api/requests', reqRoutes);
app.use('/api/chats', chatRoutes);

app.get('/', (req, res) => {
    res.send('Chat Application Backend API is online and waiting for requests.');
});

const server = http.createServer(app);

// Socket.io Real-time signaling layers Configuration
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true // 💡 BONUS FIX: Ensure your live WebSockets also accept credential syncs!
    }
});

server.listen(PORT, () => {
    console.log(`server listening on port : ${PORT}`);
});

const onlineUsers = new Map();
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

  socket.on('disconnect', () => {
    console.log(`A user disconnected: ${socket.id}`);
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`Removed user ${userId} from online map.`);
        break;
      }
    }
    io.emit('get_online_users', Array.from(onlineUsers.keys()));
  });

  socket.on('send_message', (data) => {
    const { recipientId } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      socket.to(recipientSocketId).emit('receive_message', data);
      console.log(` Message relayed to socket ${recipientSocketId}`);
    }
  });

  socket.on('video_call_offer', (data) => {
    const { recipientId, offer, connectionId } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      socket.to(recipientSocketId).emit('video_call_offer_received', {
        senderId: socket.userId || data.senderId,
        offer,
        connectionId
      });
    }
  });

  socket.on('video_call_answer', (data) => {
    const { recipientId, answer } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      socket.to(recipientSocketId).emit('video_call_answer_received', {
        answer
      });
    }
  });

  socket.on('update_preserve_toggle', (data) => {
    const { recipientId, connectionId, preserveHistory } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      socket.to(recipientSocketId).emit('preserve_toggle_updated', {
        connectionId,
        preserveHistory
      });
    }
  });

  socket.on('ice_candidate', (data) => {
    const { recipientId, candidate } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      socket.to(recipientSocketId).emit('ice_candidate_received', {
        candidate
      });
    }
  });

  socket.on('end_video_call', (data) => {
    const { recipientId } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      socket.to(recipientSocketId).emit('video_call_ended');
    }
  });
});