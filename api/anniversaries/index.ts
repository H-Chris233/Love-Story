// api/anniversaries/index.ts
// Vercel Serverless Function for getting all anniversaries
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

// Define Anniversary type
interface Anniversary {
  _id: ObjectId;
  title: string;
  date: Date;
  reminderDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  // Only allow GET requests for this endpoint
  if (request.method !== 'GET') {
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    const anniversariesCollection = db.collection('anniversaries');

    // Find all anniversaries, sorted by date (closest first)
    const anniversaries = await anniversariesCollection
      .find({})
      .sort({ date: 1 })
      .toArray();

    // Return all anniversaries (without sensitive information)
    return vercelResponse.status(200).json({
      success: true,
      anniversaries: anniversaries.map(anniversary => ({
        id: anniversary._id,
        title: anniversary.title,
        date: anniversary.date,
        reminderDays: anniversary.reminderDays,
        createdAt: anniversary.createdAt,
        updatedAt: anniversary.updatedAt
      }))
    });
  } catch (error: any) {
    console.error('Error in anniversaries handler:', error);
    
    return vercelResponse.status(500).json({
      message: 'Internal server error while fetching anniversaries',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}