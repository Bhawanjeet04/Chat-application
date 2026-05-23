const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { bytes } = require('node:stream/consumers');

const userSchema = new mongoose.Schema({
    username : {
        type : String,
        required : [true,'Username is required'],
        unique : true,
        trim : true,
        minLength : [5, 'Username must be atleast 3 characters']
    },
    password : {
        type : String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    lastSeen: {
        type: Date,
        default: Date.now
}
},{timestamps: true});

userSchema.pre('save', async function(){
    if(!this.isModified('password')) return ;

    try{
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password,salt);
    }
    catch(error){
        throw error;
    }
});

userSchema.methods.matchPassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword,this.password);
}

module.exports = mongoose.model('User',userSchema);