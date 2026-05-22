const Message = require('../models/Message');
const Connection = require('../models/Connection');

exports.getChatHistory=async(req,res)=>{
    try{
        const {connectionId}=req.params;
        const userId=req.user._id;

        const connection=await Connection.findById(connectionId);
        if(!connection){
            return res.status(404).json({message: 'chat connection not found.'});
        }
        if(!connection.sender.equals(userId) && !connection.recipient.equals(userId)){
            return res.status(403).json({ message: 'Not authorized to view this chat history.' });
        }

        const messages = await Message.find({ connectionId }).sort({ createdAt: 1 });

        res.status(200).json(messages);
    } 
    catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.saveMessage=async(req,res)=>{
    try{
        const{connectionId,text}=req.body;
        const senderId=req.user._id;

        if(!text){
            return res.status(400).json({message:'Message content required.'});
        }
        const connection = await Connection.findById(connectionId);
        if (!connection || connection.status !== 'accepted') {
      return res.status(400).json({ message: 'You can only chat with accepted connections.' });
        }
        const newMessage = await Message.create({
      connectionId,
      sender: senderId,
      text
    });
    res.status(201).json(newMessage);
    }
    catch(error){
        res.status(500).json({message: 'Server Error', error: error.message});
    }
};
exports.removeConnection = async (req, res) => {
    try {
        const { connectionId } = req.params;
        const userId = req.user._id;

        const connection = await Connection.findById(connectionId);
        if (!connection) {
            return res.status(404).json({ message: 'Chat connection not found.' });
        }

        if (!connection.sender.equals(userId) && !connection.recipient.equals(userId)) {
            return res.status(403).json({ message: 'Not authorized to remove this connection.' });
        }

        const otherUserId = connection.sender.equals(userId) 
            ? connection.recipient.toString() 
            : connection.sender.toString();

        const io = req.app.get('io');
        const onlineUsers = req.app.get('onlineUsers');

        if (io && onlineUsers) {
            const recipientSocketId = onlineUsers.get(otherUserId);
            
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('connection_removed', { connectionId });
                console.log(`Live connection removal event pushed to socket ${recipientSocketId}`);
            }
        }

        await Message.deleteMany({ connectionId });
        await Connection.findByIdAndDelete(connectionId);

        res.status(200).json({ message: 'Connection removed successfully.' });
    } 
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};