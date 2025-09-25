// api/memories/index.ts
// Vercel Serverless Function for getting all memories
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db';
import jwt from 'jsonwebtoken';
import { Db, ObjectId } from 'mongodb';

// Define JWT payload type
interface JwtPayload {
  userId: ObjectId;
  iat: number;
  exp: number;
}

// Define Memory type
interface Memory {
  _id: ObjectId;
  title: string;
  description: string;
  date: Date;
  images: Array<{
    url: string;
    publicId: string;
  }>;
  user: ObjectId;
  createdAt: Date;
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    const memoriesCollection = db.collection('memories');

    // Find all memories, sorted by date (newest first)
    const memories = await memoriesCollection
      .find({})
      .sort({ date: -1 })
      .toArray();

    // Return all memories (without sensitive information)
    return vercelResponse.status(200).json({
      success: true,
      memories: memories.map(memory => ({
        id: memory._id,
        title: memory.title,
        description: memory.description,
        date: memory.date,
        images: memory.images || [],
        user: memory.user,
        createdAt: memory.createdAt
      }))
    });
  } catch (error: any) {
    console.error('Error in memories handler:', error);
    
    return vercelResponse.status(500).json({
      message: 'Internal server error while fetching memories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}