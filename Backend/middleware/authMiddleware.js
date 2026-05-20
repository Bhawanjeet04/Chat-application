const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req,res,next) => {
    let token;

    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        try{
            token = req.headers.authorization.split(' ')[1];
            const decode = jwt.verify(token,process.env.JWT_SECRET);
            
            req.user = await User.findById(decoded.id.select('-password'));

            next();
        }catch(err){
            console.log(`Token verification failed : ${err.message}`);
            return res.status(401).json({message : 'Not authorised, token failed'});
        }
    }
    if(!token){
        return res.status(401).json({message : "Not authorised, no token provided"});
    }
};

module.exports = {protect};