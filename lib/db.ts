// lib/db.ts
// Database connection utilities for serverless functions
import { MongoClient, Db } from 'mongodb';

// Store the database connection globally to reuse in serverless functions
const globalWithMongo = global as typeof globalThis & {
  mongo: {
    client: MongoClient;
    db: Db;
  };
};

// MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

/**
 * Connect to the MongoDB database
 * @returns The database connection
 */
export async function connectToDatabase() {
  if (!globalWithMongo.mongo) {
    console.log('🌍 [DB] Creating new MongoDB connection...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(); // Use default database from URI or 'test'
    
    globalWithMongo.mongo = { client, db };
    console.log('✅ [DB] MongoDB connection established');
  }
  
  return {
    client: globalWithMongo.mongo.client,
    db: globalWithMongo.mongo.db
  };
}