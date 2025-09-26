// api/memories/index.ts
// Vercel Serverless Function for getting all memories and creating a new one
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
  _id?: ObjectId;
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
  if (request.method === 'GET') {
    // Get all memories
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
  } else if (request.method === 'POST') {
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

    // Extract memory data from request body
    const { title, description, date, images } = request.body;

    // Validate required fields
    if (!title || !description || !date) {
      return vercelResponse.status(400).json({
        message: 'Please provide title, description, and date'
      });
    }

    try {
      // Connect to database
      const { db } = await connectToDatabase();
      const memoriesCollection = db.collection('memories');

      // Create new memory object
      const newMemory: Memory = {
        title,
        description,
        date: new Date(date), // Ensure date is a proper Date object
        images: images || [],
        user: decoded.userId, // Use the authenticated user's ID
        createdAt: new Date()
      };

      // Insert new memory into database
      const result = await memoriesCollection.insertOne(newMemory);

      // Return success response with the created memory
      return vercelResponse.status(201).json({
        success: true,
        message: 'Memory created successfully',
        memory: {
          id: result.insertedId,
          title: newMemory.title,
          description: newMemory.description,
          date: newMemory.date,
          images: newMemory.images,
          user: newMemory.user,
          createdAt: newMemory.createdAt
        }
      });
    } catch (error: any) {
      console.error('Error in create memory handler:', error);
      
      return vercelResponse.status(500).json({
        message: 'Internal server error during memory creation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else {
    // Method not allowed
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }
}