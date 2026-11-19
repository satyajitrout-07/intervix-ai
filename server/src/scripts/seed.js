const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config({ path: __dirname + '/../../.env' });
const User = require('../models/User');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intervix_ai');
    console.log('[Seed]: Connected to MongoDB');

    let user = await User.findOne({ email: 'satyajit.rout@intervix.ai' });
    if (!user) {
      user = await User.create({
        name: 'Satyajit Rout',
        email: 'satyajit.rout@intervix.ai',
        password: 'Password@123',
        targetRole: 'Senior Full Stack Engineer',
        preferredStack: 'MERN Stack',
      });
      console.log('[Seed]: Created user Satyajit Rout');
    } else {
      console.log('[Seed]: User Satyajit Rout exists:', user._id);
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'intervix_ai_jwt_secure_secret_key_2026_x987',
      { expiresIn: '30d' }
    );
    console.log('[Seed]: Valid JWT Token:', token);
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
}

seed();

