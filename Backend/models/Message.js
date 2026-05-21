const mongoose=require('mongoose');

const messageSchema= new mongoose.Schema({
    connectionId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Connection',
        required:true
    },
    sender:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    text:{
        type:String,
        required:[true,'Message text cannot be empty'],
        trim:true
    }
},{timestamps:true});

module.exports=mongoose.model('Message',messageSchema);