const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.cookies && req.cookies.token) {
        try {
            token = req.cookies.token;
            
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            
            req.user = await User.findById(decode.id).select('-password');

            return next(); 
        } catch (err) {
            console.log(`Token verification failed : ${err.message}`);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decode.id).select('-password');
            return next();
        } catch (err) {
            console.log(`Token verification failed via header : ${err.message}`);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token provided" });
    }
};

module.exports = { protect };