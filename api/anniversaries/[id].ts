// api/anniversaries/[id].ts
// Vercel Serverless Function for getting, updating, or deleting a specific anniversary
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

// Define JWT payload type
interface JwtPayload {
  userId: ObjectId;
  iat: number;
  exp: number;
}



export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  const { id } = request.query;
  
  // Validate anniversary ID
  if (!id || Array.isArray(id) || !ObjectId.isValid(id)) {
    return vercelResponse.status(400).json({ 
      message: 'Valid anniversary ID required' 
    });
  }
  
  const anniversaryId = new ObjectId(id);
  
  // Extract token from Authorization header
  const authHeader = request.headers.authorization;
  let decoded: JwtPayload | null = null;
  
  // Authentication required for all requests
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return vercelResponse.status(401).json({
      message: 'Authorization token required'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
      decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'fallback_jwt_secret_for_development'
      ) as JwtPayload;
    } catch (_error) {
    return vercelResponse.status(401).json({
      message: 'Invalid or expired token'
    });
  }

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    const anniversariesCollection = db.collection('anniversaries');

    if (request.method === 'GET') {
      // Get a specific anniversary
      const anniversary = await anniversariesCollection.findOne({ _id: anniversaryId });

      if (!anniversary) {
        return vercelResponse.status(404).json({
          message: 'Anniversary not found'
        });
      }

      // Return the anniversary
      return vercelResponse.status(200).json({
        success: true,
        anniversary: {
          _id: anniversary._id,
          title: anniversary.title,
          date: anniversary.date,
          reminderDays: anniversary.reminderDays,
          createdAt: anniversary.createdAt,
          updatedAt: anniversary.updatedAt
        }
      });
    } 
    else if (request.method === 'PUT') {
      // Update an anniversary
      if (!decoded) {
        return vercelResponse.status(401).json({ message: 'Authorization token required' });
      }
      
      // Extract anniversary data from request body
      const { title, date, reminderDays } = request.body;

      // Validate required fields
      if (!title || !date || reminderDays === undefined) {
        return vercelResponse.status(400).json({
          message: 'Please provide title, date, and reminderDays'
        });
      }

      // Find the anniversary to update
      const anniversary = await anniversariesCollection.findOne({ _id: anniversaryId });
      
      if (!anniversary) {
        return vercelResponse.status(404).json({
          message: 'Anniversary not found'
        });
      }

      // Update the anniversary in the database
      const result = await anniversariesCollection.updateOne(
        { _id: anniversaryId },
        { 
          $set: { 
            title,
            date: new Date(date),
            reminderDays: parseInt(reminderDays),
            updatedAt: new Date() // Update the timestamp
          } 
        }
      );

      if (result.matchedCount === 0) {
        return vercelResponse.status(404).json({
          message: 'Anniversary not found'
        });
      }

      // Return success response
      return vercelResponse.status(200).json({
        success: true,
        message: 'Anniversary updated successfully',
        anniversary: {
          _id: anniversaryId,
          title,
          date: new Date(date),
          reminderDays: parseInt(reminderDays),
          createdAt: anniversary.createdAt, // Keep original creation date
          updatedAt: new Date() // Updated timestamp
        }
      });
    } 
    else if (request.method === 'DELETE') {
      // Delete an anniversary
      if (!decoded) {
        return vercelResponse.status(401).json({ message: 'Authorization token required' });
      }
      
      // Find the anniversary to delete
      const anniversary = await anniversariesCollection.findOne({ _id: anniversaryId });
      
      if (!anniversary) {
        return vercelResponse.status(404).json({
          message: 'Anniversary not found'
        });
      }

      // Delete the anniversary from the database
      const result = await anniversariesCollection.deleteOne({ _id: anniversaryId });

      if (result.deletedCount === 0) {
        return vercelResponse.status(404).json({
          message: 'Anniversary not found'
        });
      }

      // Return success response
      return vercelResponse.status(200).json({
        success: true,
        message: 'Anniversary deleted successfully'
      });
    } 
    else {
      // Method not allowed
      return vercelResponse.status(405).json({ 
        message: 'Method not allowed' 
      });
    }
  } catch (error: unknown) {
    console.error('Error in anniversary handler:', error);
    
    return vercelResponse.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
}