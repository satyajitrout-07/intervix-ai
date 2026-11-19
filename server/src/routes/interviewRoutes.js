const express = require('express');
const router = express.Router();
const {
  startInterview,
  submitAnswer,
  processVideoTurn,
  getInterviewById,
  getUserInterviews,
  getInterviewAnalytics,
} = require('../controllers/interviewController');
const { protect } = require('../middleware/auth');

// All interview endpoints are strictly protected by JWT authentication
router.use(protect);

router.post('/start', startInterview);
router.post('/:id/answer', submitAnswer);
router.post('/:id/video-turn', processVideoTurn);
router.get('/history', getUserInterviews);
router.get('/analytics', getInterviewAnalytics);
router.get('/:id', getInterviewById);

module.exports = router;
