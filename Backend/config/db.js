const mongoose = require('mongoose');

const connectDB = async() => {
    try{
        const conn = await mongoose.connect(process.env.MONGO_URL);
        console.log(`MongoDB connected `);
    }    
    catch(err){
        console.error(`Database connection Error : ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;