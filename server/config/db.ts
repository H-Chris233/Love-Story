import mongoose from 'mongoose';

// MongoDB connection
const connectDB = async (): Promise<void> => {
  try {
    // For local development, you can use 'mongodb://localhost:27017/love-story'
    // For production, you should use environment variables
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/love-story');

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;