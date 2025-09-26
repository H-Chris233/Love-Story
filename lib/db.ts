// lib/db.ts
// Database connection utilities for serverless functions
import { MongoClient, Db } from 'mongodb';
import { attachDatabasePool } from '@vercel/functions';

// Store the database connection globally to reuse in serverless functions
const globalWithMongo = global as typeof globalThis & {
  _mongoClient?: MongoClient;
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

const options = {
  appName: "devrel.vercel.integration",
};

/**
 * Connect to the MongoDB database
 * @returns The database connection
 */
export async function connectToDatabase() {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!globalWithMongo._mongoClient) {
      console.log('🌍 [DB] Creating new MongoDB connection (development)...');
      const client = new MongoClient(MONGODB_URI, options);
      await client.connect();
      globalWithMongo._mongoClient = client;
    }
    
    const db = globalWithMongo._mongoClient.db(); // Use default database from URI or 'test'
    
    // Store in mongo property for consistency
    globalWithMongo.mongo = { client: globalWithMongo._mongoClient, db };
    console.log('✅ [DB] MongoDB connection established');
  } else {
    // In production mode, it's best to not use a global variable for the client
    // but we'll still use global variable for the connection result to avoid reconnecting
    if (!globalWithMongo.mongo) {
      console.log('🌍 [DB] Creating new MongoDB connection (production)...');
      const client = new MongoClient(MONGODB_URI, options);
      await client.connect();
      
      // Attach the client to ensure proper cleanup on function suspension
      attachDatabasePool(client);
      
      const db = client.db(); // Use default database from URI or 'test'
      
      globalWithMongo.mongo = { client, db };
      console.log('✅ [DB] MongoDB connection established');
    }
  }
  
  return {
    client: globalWithMongo.mongo.client,
    db: globalWithMongo.mongo.db
  };
}