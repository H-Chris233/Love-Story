#!/usr/bin/env node

// scripts/clear-database.ts
// Script to clear all collections in the MongoDB database

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

// Load environment variables
config();

// MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function clearDatabase() {
  // Use the same options as in lib/db.ts for consistency
  const options = {
    appName: "devrel.vercel.integration",
  };

  const client = new MongoClient(MONGODB_URI, options);

  try {
    console.log('🌍 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db(); // Uses the database specified in the connection string
    console.log('✅ Connected to database:', db.databaseName);

    // Get all collection names
    const collections = await db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections:`, collections.map(c => c.name));

    if (collections.length === 0) {
      console.log('✅ Database is already empty');
      return;
    }

    // Confirm before proceeding
    console.log('\n⚠️  WARNING: This will permanently delete all data in the database!');
    console.log('⚠️  Collections to be cleared:', collections.map(c => c.name).join(', '));
    
    // In a real script, we would ask for confirmation, but for automation we'll proceed
    console.log('\n🚀 Proceeding with database clear...');
    
    // Drop each collection
    for (const collection of collections) {
      console.log(`🗑️  Dropping collection: ${collection.name}`);
      await db.collection(collection.name).drop();
      console.log(`✅ Collection ${collection.name} dropped`);
    }

    console.log('\n✅ All collections have been cleared successfully!');
    console.log('📊 Database now has 0 collections');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Execute the function only if this file is run directly
// A simpler approach: when the script is run directly, process.argv[1] contains its path
if (process.argv[1] && process.argv[1].endsWith('clear-database.ts')) {
  clearDatabase().catch(console.error);
} else if (process.argv[1] && process.argv[1].endsWith('clear-database.js')) {
  // In case it's compiled/transpiled
  clearDatabase().catch(console.error);
}

export { clearDatabase };