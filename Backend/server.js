const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { protect } = require('./middleware/authMiddleware');

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


app.get('/api/turn-credentials', protect, async (req, res) => {
    try {
        const apiKey = process.env.METERED_API_KEY;
        const domain = process.env.METERED_DOMAIN;

        // Fallback checks
        if (!apiKey || !domain) {
            console.log("⚠️ Metered environment variables missing, using structural fallback.");
            return res.json({
                iceServers: [
                    { urls: "stun:global.relay.metered.ca:80" },
                    {
                        urls: "turn:global.relay.metered.ca:80",
                        username: "5b0a0a3312d5ebf016c30014",
                        credential: "3KhFRYRGZudKCqlf"
                    },
                    {
                        urls: "turn:global.relay.metered.ca:80?transport=tcp",
                        username: "5b0a0a3312d5ebf016c30014",
                        credential: "3KhFRYRGZudKCqlf"
                    },
                    {
                        urls: "turn:global.relay.metered.ca:443",
                        username: "5b0a0a3312d5ebf016c30014",
                        credential: "3KhFRYRGZudKCqlf"
                    },
                    {
                        urls: "turns:global.relay.metered.ca:443?transport=tcp",
                        username: "5b0a0a3312d5ebf016c30014",
                        credential: "3KhFRYRGZudKCqlf"
                    }
                ]
            });
        }

        // ✅ Dynamic Fetch targeting your exact .metered.live app workspace endpoint
        const response = await fetch(
            `https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`
        );

        if (!response.ok) {
            throw new Error(`Metered API error: ${response.status}`);
        }

        const iceServers = await response.json();
        return res.json({ iceServers });

    } catch (err) {
        console.error('Failed to fetch TURN credentials, using structural fallback:', err.message);
        return res.json({
            iceServers: [
                { urls: "stun:global.relay.metered.ca:80" },
                {
                    urls: "turn:global.relay.metered.ca:80",
                    username: "5b0a0a3312d5ebf016c30014",
                    credential: "3KhFRYRGZudKCqlf"
                },
                {
                    urls: "turn:global.relay.metered.ca:80?transport=tcp",
                    username: "5b0a0a3312d5ebf016c30014",
                    credential: "3KhFRYRGZudKCqlf"
                },
                {
                    urls: "turn:global.relay.metered.ca:443",
                    username: "5b0a0a3312d5ebf016c30014",
                    credential: "3KhFRYRGZudKCqlf"
                },
                {
                    urls: "turns:global.relay.metered.ca:443?transport=tcp",
                    username: "5b0a0a3312d5ebf016c30014",
                    credential: "3KhFRYRGZudKCqlf"
                }
            ]
        });
    }
});

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

  socket.on('send_message', (data) => {
    const { recipientId } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      socket.to(recipientSocketId).emit('receive_message', data);
      console.log(` Message relayed to socket ${recipientSocketId}`);
    }
  });

  socket.on('video_call_offer', (data) => {
    let { recipientId, offer, connectionId, senderId } = data;
    const currentUserId = (socket.userId || senderId).toString();

    recipientId = recipientId.toString();

    if (inVideoCall.has(currentUserId) || inVideoCall.has(recipientId)) {
      socket.emit('video_call_busy', { 
        message: "User is currently busy on another call." 
      });
      return;
    }

    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      inVideoCall.add(currentUserId);
      inVideoCall.add(recipientId);
      socket.userId = currentUserId;
      socket.recipientId = recipientId;

      socket.to(recipientSocketId).emit('video_call_offer_received', {
        senderId: currentUserId,
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

  socket.on('end_video_call', (data) => {
    const { recipientId, senderId } = data;
    
    if (senderId) inVideoCall.delete(senderId.toString());
    if (recipientId) inVideoCall.delete(recipientId.toString());
    if (socket.userId) inVideoCall.delete(socket.userId.toString());

    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      socket.to(recipientSocketId).emit('video_call_ended');
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

});