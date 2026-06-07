// MongoDB connection helper (Mongoose).

import mongoose from 'mongoose';
import config from './config.js';

// Connect to MongoDB; throws on failure so we never start without a database.
export async function connectDB() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => console.log('MongoDB connected'));
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  return mongoose;
}

export default connectDB;
