import mongoose from 'mongoose';
import config from './index';

// MongoDB connection
const connectDB = async (): Promise<void> => {
  try {
    // Use the mongoURI from config which defaults to MongoDB Atlas connection string
    // Updated configuration to remove deprecated options
    const conn = await mongoose.connect(config.mongoURI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;