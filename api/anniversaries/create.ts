// api/anniversaries/create.ts
// Vercel Serverless Function for creating a new anniversary
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
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
  _id?: ObjectId;
  title: string;
  date: Date;
  reminderDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  if (request.method !== 'POST') {
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  // Extract token from Authorization header
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return vercelResponse.status(401).json({
      message: 'Authorization token required'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Verify JWT token
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_jwt_secret_for_development'
    ) as JwtPayload;
  } catch (error) {
    return vercelResponse.status(401).json({
      message: 'Invalid or expired token'
    });
  }

  // Extract anniversary data from request body
  const { title, date, reminderDays } = request.body;

  // Validate required fields
  if (!title || !date || reminderDays === undefined) {
    return vercelResponse.status(400).json({
      message: 'Please provide title, date, and reminderDays'
    });
  }

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    const anniversariesCollection = db.collection('anniversaries');

    // Check if an anniversary with the same title already exists
    const existingAnniversary = await anniversariesCollection.findOne({ title });
    if (existingAnniversary) {
      return vercelResponse.status(409).json({
        message: 'An anniversary with this title already exists'
      });
    }

    // Create new anniversary object
    const newAnniversary: Anniversary = {
      title,
      date: new Date(date), // Ensure date is a proper Date object
      reminderDays: parseInt(reminderDays),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert new anniversary into database
    const result = await anniversariesCollection.insertOne(newAnniversary);

    // Return success response with the created anniversary
    return vercelResponse.status(201).json({
      success: true,
      message: 'Anniversary created successfully',
      anniversary: {
        id: result.insertedId,
        title: newAnniversary.title,
        date: newAnniversary.date,
        reminderDays: newAnniversary.reminderDays,
        createdAt: newAnniversary.createdAt,
        updatedAt: newAnniversary.updatedAt
      }
    });
  } catch (error: any) {
    console.error('❌ [ANNIVERSARY] Error creating anniversary:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      userId: decoded.userId,
      payload: {
        title: request.body.title,
        date: request.body.date,
        reminderDays: request.body.reminderDays
      },
      ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress
    });
    
    return vercelResponse.status(500).json({
      message: 'Internal server error during anniversary creation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}