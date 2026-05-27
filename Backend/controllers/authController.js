const User = require('../models/User');
const bcrypt = require('bcryptjs');
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

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both current and new passwords are required.' });
        }

        const user = await User.findById(userId).select('+password');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password.' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


module.exports = { registerUser, loginUser, changePassword};