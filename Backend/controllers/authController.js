const User = require('../models/User');
const jwt  = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

const registerUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "please provide all fields" });
        }

        const userexists = await User.findOne({ username: username.toLowerCase().trim() });
        if (userexists) {
            return res.status(400).json({ message: "Username is already taken" });
        }

        const user = await User.create({ username, password });

        if (user) {
            const token = generateToken(user._id);

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax', 
                maxAge: 30 * 24 * 60 * 60 * 1000 
            });

            res.status(201).json({
                _id: user._id,
                username: user.username
            });
        } else {
            res.status(400).json({ message: "Invalid user data received" });
        }
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
}

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username: username.toLowerCase().trim() });

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });

            res.json({
                _id: user._id,
                username: user.username
            });
        } else {
            res.status(400).json({ message: "Invalid Username or password" });
        }
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
}

module.exports = { registerUser, loginUser };