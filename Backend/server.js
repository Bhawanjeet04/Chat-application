const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const {Server} = require('socket.io');
const cors = require('cors')

const authRoutes = require('./routes/authRoutes');

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors({
    origin : process.env.CLIENT_URL || 'http://localhost:5173',
    Credentials : true
}));

app.use(express.json());
app.use(express.urlencoded({extended : true}));

connectDB();

app.use('/api/auth',authRoutes);

app.get('/',(req,res)=>{
    res.send('Chat Application Backend API is online and waiting for requests.');
})

const server = http.createServer(app);

const io = new Server(server,{
    cors :{
        origin : process.env.CLIENT_URL || 'http://localhost:5173',
        methods :['GET','POST']
    }
});


server.listen(PORT, ()=>{
    console.log(`server listening on port : ${PORT}`);
});
