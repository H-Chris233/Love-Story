// api/anniversaries/create.ts
// Vercel Serverless Function for creating a new anniversary
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
  _id?: ObjectId;
  title: string;
  date: Date;
  reminderDays: number;
  createdAt: Date;
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  try {
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
    if (!title || !date) {
      return vercelResponse.status(400).json({
        message: 'Please provide title and date'
      });
    }

    // Validate reminderDays if provided
    const validatedReminderDays = reminderDays !== undefined ? 
      Math.max(0, Math.min(30, parseInt(reminderDays))) : 1; // Default to 1 day

    // Connect to database
    const { db } = await connectToDatabase();
    const anniversariesCollection = db.collection('anniversaries');

    // Create new anniversary object
    const newAnniversary: Anniversary = {
      title,
      date: new Date(date), // Ensure date is a proper Date object
      reminderDays: validatedReminderDays,
      createdAt: new Date()
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
        createdAt: newAnniversary.createdAt
      }
    });
  } catch (error: any) {
    console.error('Error in create anniversary handler:', error);
    
    return vercelResponse.status(500).json({
      message: 'Internal server error during anniversary creation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}