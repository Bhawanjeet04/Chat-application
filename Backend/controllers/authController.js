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

        const sanitizedUsername = username.toLowerCase().trim();

        const userexists = await User.findOne({ username: sanitizedUsername });
        if (userexists) {
            return res.status(400).json({ message: "Username is already taken" });
        }

        // ✅ Save it explicitly lowercased to match all future query tokens
        const user = await User.create({ username: sanitizedUsername, password });

        if (user) {
            const token = generateToken(user._id);

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'None', 
                maxAge: 30 * 24 * 60 * 60 * 1000 
            });

            return res.status(201).json({
                _id: user._id,
                username: user.username
            });
        } else {
            return res.status(400).json({ message: "Invalid user data received" });
        }
    } catch (err) {
        return res.status(500).json({ message: "Server Error", error: err.message });
    }
}

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        const sanitizedUsername = username.toLowerCase().trim();
        const user = await User.findOne({ username: sanitizedUsername });

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });

            return res.json({
                _id: user._id,
                username: user.username
            });
        } else {
            return res.status(400).json({ message: "Invalid Username or password" });
        }
    } catch (err) {
        return res.status(500).json({ message: "Server Error", error: err.message });
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

        return res.status(200).json({ message: 'Password updated successfully!' });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const userId = req.user._id; 

        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ message: 'User account not found.' });
        }
        res.clearCookie('token', {
            httpOnly: true,
            secure: true,
            sameSite: 'None'
        });

        return res.status(200).json({ message: 'Your account has been permanently deleted.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { registerUser, loginUser, changePassword, deleteAccount };