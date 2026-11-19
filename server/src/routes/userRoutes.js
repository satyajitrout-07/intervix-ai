const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getUserProfile, updateUserProfile } = require('../controllers/userController');

router.use(protect);

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

module.exports = router;
