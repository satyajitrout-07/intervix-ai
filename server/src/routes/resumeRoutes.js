const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const {
  uploadResume,
  getLatestResume,
  getResumeById,
  updateConfirmedProfile,
  getPreviewQuestions,
  confirmAndStartInterview,
} = require('../controllers/resumeController');

// Multer memory storage configuration (Max 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    const allowedExts = ['.pdf', '.docx', '.doc'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please upload a valid PDF or DOCX resume document.'), false);
    }
  },
});

// All resume routes require authentication
router.use(protect);

// Upload and analyze resume
router.post('/upload', upload.single('resumeFile'), uploadResume);

// Get latest uploaded resume
router.get('/latest', getLatestResume);

// Get resume by ID
router.get('/:id', getResumeById);

// Update confirmed profile data
router.put('/:id', updateConfirmedProfile);

// Get dynamic preview questions
router.post('/:id/preview-questions', getPreviewQuestions);

// Confirm profile and initialize personalized interview session
router.post('/:id/confirm-and-start', confirmAndStartInterview);

module.exports = router;
