const express = require('express')
const routes = express.Router();
const {registerUser,loginUser, changePassword, deleteAccount} = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware');

routes.post('/register',registerUser);
routes.post('/login',loginUser)
routes.put('/change-password', protect, changePassword);
routes.delete('/delete-account', protect, deleteAccount);

module.exports = routes;