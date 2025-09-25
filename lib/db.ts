// lib/db.ts - Database connection for Vercel Serverless Functions
import { MongoClient, ServerApiVersion, Db } from 'mongodb';
import { attachDatabasePool } from '@vercel/functions';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/love-story';
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let client: MongoClient;
let db: Db;

declare global {
  var _mongoClient: MongoClient | undefined;
}

export async function connectToDatabase() {
  if (db) {
    return { client, db };
  }

  if (process.env.NODE_ENV === 'development') {
    // In development, use a global variable to preserve connection across hot reloads
    if (!global._mongoClient) {
      global._mongoClient = new MongoClient(uri, options);
      await global._mongoClient.connect();
    }
    client = global._mongoClient;
  } else {
    // In production, create a new client each time but attach for cleanup
    client = new MongoClient(uri, options);
    await client.connect();
    attachDatabasePool(client);
  }

  db = client.db();

  return { client, db };
}