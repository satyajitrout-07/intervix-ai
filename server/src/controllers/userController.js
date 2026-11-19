const User = require('../models/User');
const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const bcrypt = require('bcryptjs');

// @desc    Get current user profile & stats
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const interviews = await Interview.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const resumes = await Resume.find({ userId: req.user._id }).sort({ createdAt: -1 });

    const completed = interviews.filter((i) => i.status === 'completed');
    const scores = completed.map((i) => i.finalReport?.overallScore || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          totalInterviews: interviews.length,
          completedInterviews: completed.length,
          avgScore,
          totalResumesUploaded: resumes.length,
          latestResumeId: resumes[0]?._id || null,
        },
        recentInterviews: interviews.slice(0, 5),
        resumes: resumes.map((r) => ({
          id: r._id,
          fileName: r.fileName,
          fileSize: r.fileSize,
          createdAt: r.createdAt,
          status: r.status,
          candidateName: r.confirmedData?.candidateName || r.parsedData?.candidateName,
        })),
      },
    });
  } catch (error) {
    console.error('[Get User Profile Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching user profile.',
    });
  }
};

// @desc    Update user profile & settings
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { name, targetRole, preferredStack, currentPassword, newPassword } = req.body || {};
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (name) user.name = name.trim();
    if (targetRole) user.targetRole = targetRole.trim();
    if (preferredStack) user.preferredStack = preferredStack.trim();

    // Password change verification
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Please provide your current password to set a new password.',
        });
      }
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password does not match.',
        });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters.',
        });
      }
      user.password = newPassword;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile and settings updated successfully.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          targetRole: user.targetRole,
          preferredStack: user.preferredStack,
        },
      },
    });
  } catch (error) {
    console.error('[Update User Profile Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating profile.',
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
};
