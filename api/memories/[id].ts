// api/memories/[id].ts
// Vercel Serverless Function for getting, updating, or deleting a specific memory
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
  images?: Array<{
    url: string;
    publicId: string;
  }>;
  user: ObjectId;
  createdAt: Date;
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  const { id } = request.query;
  
  // Validate memory ID
  if (!id || Array.isArray(id) || !ObjectId.isValid(id)) {
    return vercelResponse.status(400).json({ 
      message: 'Valid memory ID required' 
    });
  }
  
  const memoryId = new ObjectId(id);
  
  // Extract token from Authorization header
  const authHeader = request.headers.authorization;
  let decoded: JwtPayload | null = null;
  
  if (request.method !== 'GET') { // Authentication required for non-GET requests
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return vercelResponse.status(401).json({
        message: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
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
  }

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    const memoriesCollection = db.collection('memories');

    if (request.method === 'GET') {
      // Get a specific memory
      const memory = await memoriesCollection.findOne({ _id: memoryId });

      if (!memory) {
        return vercelResponse.status(404).json({
          message: 'Memory not found'
        });
      }

      // Return the memory
      return vercelResponse.status(200).json({
        success: true,
        memory: {
          id: memory._id,
          title: memory.title,
          description: memory.description,
          date: memory.date,
          images: memory.images || [],
          user: memory.user,
          createdAt: memory.createdAt
        }
      });
    } 
    else if (request.method === 'PUT') {
      // Update a memory
      if (!decoded) {
        return vercelResponse.status(401).json({ message: 'Authorization token required' });
      }
      
      // Extract memory data from request body
      const { title, description, date, images } = request.body;

      // Validate required fields
      if (!title || !description || !date) {
        return vercelResponse.status(400).json({
          message: 'Please provide title, description, and date'
        });
      }

      // Find the memory to update
      const memory = await memoriesCollection.findOne({ _id: memoryId });
      
      if (!memory) {
        return vercelResponse.status(404).json({
          message: 'Memory not found'
        });
      }

      // Check if the user owns this memory
      if (memory.user.toString() !== decoded.userId.toString()) {
        return vercelResponse.status(403).json({
          message: 'Not authorized to update this memory'
        });
      }

      // Update the memory in the database
      const result = await memoriesCollection.updateOne(
        { _id: memoryId },
        { 
          $set: { 
            title,
            description,
            date: new Date(date),
            images: images || [],
            // Don't update user field or createdAt
          } 
        }
      );

      if (result.matchedCount === 0) {
        return vercelResponse.status(404).json({
          message: 'Memory not found'
        });
      }

      // Return success response
      return vercelResponse.status(200).json({
        success: true,
        message: 'Memory updated successfully',
        memory: {
          id: memoryId,
          title,
          description,
          date: new Date(date),
          images: images || [],
          user: decoded.userId,
          createdAt: memory.createdAt // Keep original creation date
        }
      });
    } 
    else if (request.method === 'DELETE') {
      // Delete a memory
      if (!decoded) {
        return vercelResponse.status(401).json({ message: 'Authorization token required' });
      }
      
      // Find the memory to delete
      const memory = await memoriesCollection.findOne({ _id: memoryId });
      
      if (!memory) {
        return vercelResponse.status(404).json({
          message: 'Memory not found'
        });
      }

      // Check if the user owns this memory
      if (memory.user.toString() !== decoded.userId.toString()) {
        return vercelResponse.status(403).json({
          message: 'Not authorized to delete this memory'
        });
      }

      // Delete the memory from the database
      const result = await memoriesCollection.deleteOne({ _id: memoryId });

      if (result.deletedCount === 0) {
        return vercelResponse.status(404).json({
          message: 'Memory not found'
        });
      }

      // Return success response
      return vercelResponse.status(200).json({
        success: true,
        message: 'Memory deleted successfully'
      });
    } 
    else {
      // Method not allowed
      return vercelResponse.status(405).json({ 
        message: 'Method not allowed' 
      });
    }
  } catch (error: any) {
    console.error('Error in memory handler:', error);
    
    return vercelResponse.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}