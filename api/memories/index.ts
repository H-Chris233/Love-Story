// api/memories/index.ts
// Vercel Serverless Function for getting all memories and creating a new one
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import jwt from 'jsonwebtoken';
import { Db, ObjectId } from 'mongodb';
import logger from '../../lib/logger.js';
import { getClientIP } from '../utils.js';

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
  images: { url: string; publicId: string }[];
  user: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Define User type
interface User {
  _id: ObjectId;
  name: string;
  email: string;
  isAdmin: boolean;
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  const ip = getClientIP(request);
  
  if (request.method === 'GET') {
    // Get all shared memories
    try {
      logger.memory('Fetching all shared memories', {
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      // Connect to database
      const { db } = await connectToDatabase();
      const memoriesCollection = db.collection('memories');
      const usersCollection = db.collection('users');

      // Find all memories, sorted by date (newest first), and populate user data
      const memories = await memoriesCollection
        .find({})
        .sort({ date: -1 })
        .toArray();

      // For each memory, get user data (name and email)
      const memoriesWithUser = await Promise.all(
        memories.map(async (memory: any) => {
          const user = await usersCollection.findOne(
            { _id: memory.user },
            { projection: { name: 1, email: 1 } }
          );
          
          return {
            id: memory._id,
            title: memory.title,
            description: memory.description,
            date: memory.date,
            images: memory.images || [],
            user: user ? {
              id: user._id,
              name: user.name,
              email: user.email
            } : null,
            createdAt: memory.createdAt,
            updatedAt: memory.updatedAt
          };
        })
      );

      logger.memory(`Successfully fetched ${memoriesWithUser.length} shared memories`, {
        count: memoriesWithUser.length,
        timestamp: new Date().toISOString()
      });
      
      return vercelResponse.status(200).json({
        success: true,
        memories: memoriesWithUser
      });
    } catch (error: any) {
      logger.error('Error fetching memories', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip
      });
      
      return vercelResponse.status(500).json({ 
        message: 'Error fetching memories',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else if (request.method === 'POST') {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authorization token required', {
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

    // Verify JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'fallback_jwt_secret_for_development'
      ) as JwtPayload;
    } catch (error) {
      logger.warn('Invalid or expired token', {
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      return vercelResponse.status(401).json({
        message: 'Invalid or expired token'
      });
    }

    // Extract memory data from request body
    const { title, description, date } = request.body;

    // Validate required fields
    if (!title || !description || !date) {
      logger.warn('Missing required fields in memory creation request', {
        missingFields: [
          !title && 'title',
          !description && 'description', 
          !date && 'date'
        ].filter(Boolean),
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        userId: decoded.userId?.toString(),
        ip
      });
      
      return vercelResponse.status(400).json({ 
        message: 'Title, description, and date are required',
        missingFields: [
          !title && 'title',
          !description && 'description', 
          !date && 'date'
        ].filter(Boolean)
      });
    }

    try {
      logger.memory('Starting to create new memory', {
        title,
        userId: decoded.userId?.toString(),
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });

      // Connect to database
      const { db } = await connectToDatabase();
      const memoriesCollection = db.collection('memories');

      // Create new memory object
      const newMemory: Memory = {
        title,
        description,
        date: new Date(date), // Ensure date is a proper Date object
        images: [], // Initialize with empty images array
        user: decoded.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Insert new memory into database
      const result = await memoriesCollection.insertOne(newMemory);

      logger.memory('Memory created successfully', {
        memoryId: result.insertedId.toString(),
        userId: decoded.userId?.toString(),
        title: newMemory.title,
        timestamp: new Date().toISOString()
      });

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
          user: decoded.userId,
          createdAt: newMemory.createdAt,
          updatedAt: newMemory.updatedAt
        }
      });
    } catch (error: any) {
      logger.error('Error creating memory', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        userId: decoded.userId?.toString(),
        payload: {
          title: request.body.title,
          description: request.body.description ? 'provided' : 'missing',
          date: request.body.date
        },
        ip
      });
      
      return vercelResponse.status(500).json({ 
        message: 'Error creating memory',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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