const mongoose = require('mongoose');

/**
 * Connect to MongoDB instance (Local or Atlas)
 * Supports both MONGODB_URI and MONGO_URI environment variables.
 * Default fallback: mongodb://127.0.0.1:27017/intervix_ai
 */
const connectDB = async () => {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/intervix_ai';

  try {
    // Connection event listeners for resilient lifecycle tracking
    mongoose.connection.on('connected', () => {
      console.log(`[MongoDB Connected]: Host -> ${mongoose.connection.host}, Database -> ${mongoose.connection.name}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB Runtime Error]: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB Disconnected]: Database connection lost.');
    });

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    return conn;
  } catch (error) {
    console.error(`[MongoDB Initial Connection Failed]: ${error.message}`);
    console.error(`[MongoDB Connection Hint]: Ensure MongoDB is running locally on port 27017 (e.g. via MongoDB Compass or Windows Service).`);
    // Do not crash server, allowing health check to report status and retry on next request
    return null;
  }
};

module.exports = connectDB;
