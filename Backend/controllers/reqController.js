const Connection = require('../models/Connection');
const User = require('../models/User');

exports.sendConnectionRequest = async (req, res) => {
    try {
        const { targetUsername } = req.body; 
        const senderId = req.user._id;

        if (!targetUsername) {
            return res.status(400).json({ message: 'Please Provide a username to connect with.' });
        }

        const recipient = await User.findOne({ username: targetUsername.toLowerCase().trim() });
        if (!recipient) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (recipient._id.toString() === senderId.toString()) {
            return res.status(400).json({ message: 'You cannot send a connection request to yourself.' });
        }

        const existingConnection = await Connection.findOne({
            $or: [
                { sender: senderId, recipient: recipient._id },
                { sender: recipient._id, recipient: senderId }
            ]
        });

        if (existingConnection) {
            if (existingConnection.status === 'accepted') {
                return res.status(400).json({ message: 'You are already connected with this user.' });
            }
            if (existingConnection.status === 'pending') {
                return res.status(400).json({ message: 'A connection request is already pending between you two.' });
            }
            if (existingConnection.status === 'declined') {
                existingConnection.sender = senderId;
                existingConnection.recipient = recipient._id;
                existingConnection.status = 'pending';
                await existingConnection.save();
                return res.status(200).json({ message: 'Connection request resent successfully!', connection: existingConnection });
            }
        }

        const newConnection = await Connection.create({
            sender: senderId,
            recipient: recipient._id,
            status: 'pending',
        });

        return res.status(201).json({
            message: 'Connection request sent successfully!',
            connection: newConnection
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getPendingRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const requests = await Connection.find({ 
            recipient: userId, status: 'pending' 
        }).populate('sender', 'username');
        
        return res.status(200).json(requests);
    }
    catch (error) {
        return res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.respondToRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { action } = req.body; 
        const currentUserId = req.user._id;

        const connectionRequest = await Connection.findById(requestId).populate('sender recipient');
        
        if (!connectionRequest) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (action === 'accepted') {
            connectionRequest.status = 'accepted';
            await connectionRequest.save();

            const io = req.app.get('io');
            const onlineUsers = req.app.get('onlineUsers');

            if (io && onlineUsers) {
                const sender = connectionRequest.sender;       
                const recipient = connectionRequest.recipient; 

                if (sender && recipient) {
                    const payloadForSender = {
                        connectionId: connectionRequest._id.toString(),
                        userId: recipient._id.toString(),
                        username: recipient.username
                    };

                    const payloadForRecipient = {
                        connectionId: connectionRequest._id.toString(),
                        userId: sender._id.toString(),
                        username: sender.username
                    };

                    const senderSocketId = onlineUsers.get(sender._id.toString());
                    if (senderSocketId) {
                        io.to(senderSocketId).emit('connection_accepted', payloadForSender);
                    }

                    const recipientSocketId = onlineUsers.get(recipient._id.toString());
                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit('connection_accepted', payloadForRecipient);
                    }
                }
            }
            return res.status(200).json({ message: "Request accepted successfully!" });
        }
        
        if (action === 'declined' || action === 'rejected') {
            connectionRequest.status = 'declined'; 
            await connectionRequest.save();

            return res.status(200).json({ message: "Request declined successfully!" });
        }

        return res.status(400).json({ message: "Invalid action type." });

    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.getAcceptedConnections = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const connections = await Connection.find({
            status: 'accepted',
            $or: [{ sender: userId }, { recipient: userId }]
        }).populate('sender recipient', 'username lastSeen'); 

        const formattedList = connections.map(conn => {
            // ✅ Robust Fallback Check: Guard against corrupted/deleted users in database
            if (!conn.sender || !conn.recipient) return null;

            // ✅ String conversion comparison ensures flawless cross-origin evaluation
            const isSender = conn.sender._id.toString() === userId.toString();
            const targetUser = isSender ? conn.recipient : conn.sender;

            return {
                connectionId: conn._id,
                userId: targetUser._id,
                username: targetUser.username,
                preserveHistory: conn.preserveHistory || false,
                lastSeen: targetUser.lastSeen 
            };
        }).filter(item => item !== null); // Clear broken references gracefully

        return res.status(200).json(formattedList);
    } catch (error) {
        return res.status(500).json({ message: 'Server Error matching links', error: error.message });
    }
};

exports.getSentRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const requests = await Connection.find({ 
            sender: userId, 
            status: 'pending' 
        }).populate('recipient', 'username');

        const formattedList = requests.map(reqItem => {
            if (!reqItem.recipient) return null;
            return {
                _id: reqItem._id,
                recipient: {
                    _id: reqItem.recipient._id,
                    username: reqItem.recipient.username
                },
                createdAt: reqItem.createdAt
            };
        }).filter(item => item !== null);

        return res.status(200).json(formattedList);
    } catch (error) {
        return res.status(500).json({ message: 'Server Error', error: error.message });
    }
};