import mongoose from 'mongoose';
import config from './index';

// MongoDB connection
const connectDB = async (): Promise<void> => {
  console.log(`🔗 [DATABASE] Starting MongoDB connection...`);
  console.log(`🔗 [DATABASE] Connection URI: ${config.mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
  
  try {
    // Use the mongoURI from config which defaults to MongoDB Atlas connection string
    // Updated configuration to remove deprecated options
    const conn = await mongoose.connect(config.mongoURI);

    console.log(`✅ [DATABASE] MongoDB Connected Successfully:`);
    console.log(`✅ [DATABASE] - Host: ${conn.connection.host}`);
    console.log(`✅ [DATABASE] - Database: ${conn.connection.name}`);
    console.log(`✅ [DATABASE] - Connection state: ${conn.connection.readyState === 1 ? 'Connected' : 'Not connected'}`);
    console.log(`✅ [DATABASE] - MongoDB version: ${conn.connection.db?.admin().serverInfo ? 'Available' : 'Unknown'}`);
    
    // Log connection events
    mongoose.connection.on('connected', () => {
      console.log(`🔗 [DATABASE] Mongoose connected to MongoDB`);
    });
    
    mongoose.connection.on('error', (err) => {
      console.error(`❌ [DATABASE] Mongoose connection error:`, err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log(`⚠️  [DATABASE] Mongoose disconnected from MongoDB`);
    });
    
  } catch (error: any) {
    console.error(`❌ [DATABASE] MongoDB connection failed:`);
    console.error(`❌ [DATABASE] Error: ${error.message}`);
    if (error.stack) {
      console.error(`❌ [DATABASE] Stack: ${error.stack}`);
    }
    console.error(`💥 [DATABASE] Exiting process due to database connection failure`);
    process.exit(1);
  }
};

export default connectDB;