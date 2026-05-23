const express = require('express');
const router  = express.Router();

const {sendConnectionRequest,getPendingRequests,respondToRequest,getAcceptedConnections,getSentRequests} = require('../controllers/reqController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send',protect,sendConnectionRequest);
router.get('/pending',protect,getPendingRequests);
router.put('/respond/:requestId',protect,respondToRequest);
router.get('/accepted', protect,getAcceptedConnections);
router.get('/sent', protect, getSentRequests);

module.exports = router;