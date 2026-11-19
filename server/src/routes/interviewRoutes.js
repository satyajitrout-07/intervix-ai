const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  startInterview,
  submitAnswer,
  processVideoTurn,
  nextQuestion,
  skipQuestion,
  finishInterview,
  transcribeAudio,
  getInterviewById,
  getUserInterviews,
  getInterviewAnalytics,
} = require('../controllers/interviewController');
const { protect } = require('../middleware/auth');

// Multer memory storage for audio files (Max 15MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// All interview endpoints are strictly protected by JWT authentication
router.use(protect);

router.post('/start', startInterview);
router.get('/history', getUserInterviews);
router.get('/analytics', getInterviewAnalytics);
router.post('/transcribe', upload.single('audioFile'), transcribeAudio);

router.get('/:id', getInterviewById);
router.post('/:id/answer', submitAnswer);
router.post('/:id/video-turn', processVideoTurn);
router.post('/:id/next-question', nextQuestion);
router.post('/:id/skip-question', skipQuestion);
router.post('/:id/finish', finishInterview);
router.post('/:id/transcribe', upload.single('audioFile'), transcribeAudio);

module.exports = router;
