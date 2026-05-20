const Connection = require('../models/Connection');
const User = require('../models/User');

exports.sendRequest=async (req,res)=>{
    try{
        const {targetusername}=req.body;
        const senderid=req.user._id;
        if(!targetusername){
            return res.status(400).json({message:'Please Provide a username to connectwith.'});
        }

        const recipient=await user.findOne({username: targetusername.toLowercase().trim()});
        if(!recipient){
            return res.status(404).json({message:'User not found.'});
        }

        if(recipient._id.equals(senderid)){
            return res.status(400).json({message:'You cannot send a connection request to yourself.'});
        }
        const existingConnection=await Connection.findOne({
            $or:[
                {sender:senderid, recipient:recipient._id},
                {sender: recipient._id, recipient:senderid}
            ]
        });

        if(existingConnection){
            if(existingConnection.status==='accepted'){
                return res.status(400).json({message:'You are already connected with this user.'});
            }
            if(existingConnection.status==='pending'){
                return res.status(400).json({message:'A connection request is already pending between you two.'});
            }
            if (existingConnection.status === 'declined') {
                existingConnection.sender = senderId;
                existingConnection.recipient = recipient._id;
                existingConnection.status = 'pending';
                await existingConnection.save();
                return res.status(200).json({ message: 'Connection request resent successfully!', connection: existingConnection });
            }
        }

        const newConnection=await Connection.create({
            sender:senderid,
            recipient:recipient._id,
            status:'pending',
        });

        res.status(201).json({
            message:'Connection request sent successfully!',
            connection: newConnection
        });
    }
    catch(error){
        res.status(500).json({message: 'Server Error', error:error.message});
    }
};

exports.getPendingRequests=async(req,res)=>{
    try{
        const userid=req.user._id;
        const requests=await Connection.find({recipient:userid, status:'pending'}).populate('sender','username');
        res.status(200).json(requests);
    }
    catch(error){
        res.status(500).json({message:'Server Error',error:error.message});
    }
}


exports.respontToRequest=async(req,res)=>{
    try{
        const {requestid}=req.params;
        const {action}=req.body;
        const userid=req.user._id;

        if(!['accepted','declined'].includes(action)){
            return res.status(400).jason({mesage:'Invalid action. Must be "accepted" or "declined".'});
        }
        const connection=await Connection.findById(requestid);
        if(!connection){
            return res.status(404).json({message:'Connection request not found.'});
        }
        if (!connection.recipient.equals(userId)) {
            return res.status(403).json({ message: 'Not authorized to respond to this request.' });
        }
        connection.status=action;
        await connection.save();

        res.status(200).json({
            message:`Request successfully ${action}!`,
            connection
        });
    }
    catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }

};



