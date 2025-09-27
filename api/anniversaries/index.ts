// api/anniversaries/index.ts
// Vercel Serverless Function for getting all anniversaries and creating a new anniversary
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import logger from '../../lib/logger.js';
import { getClientIP } from '../utils.js';

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
  const ip = getClientIP(request);

  if (request.method === 'GET') {
    logger.anniversary('Fetching all anniversaries', {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });

    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Authorization token required for anniversaries access', {
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          ip
        });
        
        return vercelResponse.status(401).json({
          message: 'Authorization token required'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      try {
        const decoded = jwt.verify(
          token, 
          process.env.JWT_SECRET || 'fallback_jwt_secret_for_development'
        ) as JwtPayload;
      } catch (_error) {
        logger.warn('Invalid or expired token for anniversaries access', {
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          ip
        });
        
        return vercelResponse.status(401).json({
          message: 'Invalid or expired token'
        });
      }

      // Connect to database
      const { db } = await connectToDatabase();
      const anniversariesCollection = db.collection('anniversaries');

      // Find all anniversaries, sorted by date (closest first)
      const anniversaries = await anniversariesCollection
        .find({})
        .sort({ date: 1 })
        .toArray();

      logger.anniversary(`Successfully fetched ${anniversaries.length} anniversaries`, {
        count: anniversaries.length,
        timestamp: new Date().toISOString()
      });

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
    } catch (_error: unknown) {
      logger.error('Error in anniversaries handler', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip
      });
      
      return vercelResponse.status(500).json({
        message: 'Internal server error while fetching anniversaries',
        error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      });
    }
  } else if (request.method === 'POST') {
    logger.anniversary('Starting anniversary creation', {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });

    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authorization token required for anniversary creation', {
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      return vercelResponse.status(401).json({
        message: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        const _decoded = jwt.verify(
          token, 
          process.env.JWT_SECRET || 'fallback_jwt_secret_for_development'
        ) as JwtPayload;
      } catch (_error) {
      logger.warn('Invalid or expired token for anniversary creation', {
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      return vercelResponse.status(401).json({
        message: 'Invalid or expired token'
      });
    }

    // Extract anniversary data from request body
    const { title, date, reminderDays } = request.body;

    // Validate required fields
    if (!title || !date || reminderDays === undefined) {
      logger.warn('Missing required fields in anniversary creation request', {
        missingFields: [
          !title && 'title',
          !date && 'date', 
          reminderDays === undefined && 'reminderDays'
        ].filter(Boolean),
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        userId: decoded.userId?.toString(),
        ip
      });
      
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
        logger.warn('Anniversary with same title already exists', {
          title,
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          userId: decoded.userId?.toString(),
          ip
        });
        
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

      logger.anniversary('Anniversary created successfully', {
        anniversaryId: result.insertedId.toString(),
        title: newAnniversary.title,
        date: newAnniversary.date,
        reminderDays: newAnniversary.reminderDays,
        userId: decoded.userId?.toString(),
        timestamp: new Date().toISOString()
      });

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
    } catch (_error: unknown) {
      logger.error('Error creating anniversary', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        userId: decoded.userId?.toString(),
        payload: {
          title: request.body.title,
          date: request.body.date,
          reminderDays: request.body.reminderDays
        },
        ip
      });
      
      return vercelResponse.status(500).json({
        message: 'Internal server error during anniversary creation',
        error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      });
    }
  } else {
    // Method not allowed
    logger.warn('Method not allowed', {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });
    
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }
}