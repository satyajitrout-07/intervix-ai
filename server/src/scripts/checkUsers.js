const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../../.env' });
const User = require('../models/User');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intervix_ai');
    const users = await User.find({}, 'name email createdAt');
    console.log('Total users found:', users.length);
    users.forEach(u => console.log(`- Name: ${u.name} | Email: ${u.email} | ID: ${u._id}`));
    process.exit(0);
  } catch (err) {
    console.error('Check users failed:', err);
    process.exit(1);
  }
}

check();
