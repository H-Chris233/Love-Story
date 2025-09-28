import mongoose from 'mongoose';
import config from './index';
import logger from '../utils/logger';

// MongoDB connection
const connectDB = async (): Promise<void> => {
  console.log(`🔗 [DATABASE] Starting MongoDB connection...`);
  console.log(`🔗 [DATABASE] Connection URI: ${config.mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
  
  try {
    // Use the mongoURI from config which defaults to MongoDB Atlas connection string
    // Updated configuration to remove deprecated options
    const conn = await mongoose.connect(config.mongoURI);

    logger.database(`MongoDB Connected Successfully:`);
    logger.database(`- Host: ${conn.connection.host}`);
    logger.database(`- Database: ${conn.connection.name}`);
    logger.database(`- Connection state: ${conn.connection.readyState === 1 ? 'Connected' : 'Not connected'}`);
    logger.database(`- MongoDB version: ${conn.connection.db?.admin().serverInfo ? 'Available' : 'Unknown'}`);
    
    // Log connection events
    mongoose.connection.on('connected', () => {
      logger.database('Mongoose connected to MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      logger.error(`Mongoose connection error:`, err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.database('Mongoose disconnected from MongoDB');
    });
    
  } catch (error: unknown) {
    logger.error(`MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      logger.error(`Stack: ${error.stack}`);
    }
    logger.error(`Exiting process due to database connection failure`);
    process.exit(1);
  }
};

export default connectDB;