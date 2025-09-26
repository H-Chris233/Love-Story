// api/memories/[id].ts
// Vercel Serverless Function for getting, updating, and deleting a specific memory
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../../lib/db.js';
import jwt from 'jsonwebtoken';
import { Db, ObjectId } from 'mongodb';
import logger from '../../../lib/logger.js';
import { getClientIP } from '../../utils.js';

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
  
  // Extract memory ID from URL
  const { id: memoryId } = request.query;
  
  // Validate memory ID
  if (!memoryId || typeof memoryId !== 'string' || !ObjectId.isValid(memoryId)) {
    logger.warn('Invalid memory ID provided', {
      memoryId,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });
    
    return vercelResponse.status(400).json({ 
      message: 'Invalid memory ID' 
    });
  }

  if (request.method === 'GET') {
    // Get specific memory
    try {
      logger.memory('Fetching specific memory', {
        memoryId,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      // Connect to database
      const { db } = await connectToDatabase();
      const memoriesCollection = db.collection('memories');
      const usersCollection = db.collection('users');

      // Find memory by ID
      const memory = await memoriesCollection.findOne({ _id: new ObjectId(memoryId) });

      if (!memory) {
        logger.warn('Memory not found', {
          memoryId,
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          ip
        });
        
        return vercelResponse.status(404).json({ 
          message: 'Memory not found' 
        });
      }

      // Get user data (name and email)
      const user = await usersCollection.findOne(
        { _id: memory.user },
        { projection: { name: 1, email: 1 } }
      );

      logger.memory('Successfully fetched memory', {
        memoryId,
        timestamp: new Date().toISOString()
      });

      // Return memory with user data
      return vercelResponse.status(200).json({
        success: true,
        memory: {
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
        }
      });
    } catch (error: any) {
      logger.error('Error fetching memory', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        memoryId,
        ip
      });
      
      return vercelResponse.status(500).json({ 
        message: 'Error fetching memory',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else if (request.method === 'PUT') {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authorization token required for memory update', {
        memoryId,
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
      logger.warn('Invalid or expired token for memory update', {
        memoryId,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      return vercelResponse.status(401).json({
        message: 'Invalid or expired token'
      });
    }

    // Find the user to check if they are an admin
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ _id: decoded.userId });

    // Extract memory data from request body
    const { title, description, date } = request.body;

    // Validate required fields
    if (!title && !description && !date) {
      logger.warn('At least one field is required for memory update', {
        memoryId,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        userId: decoded.userId?.toString(),
        ip
      });
      
      return vercelResponse.status(400).json({ 
        message: 'At least one field (title, description, or date) is required for update'
      });
    }

    try {
      logger.memory('Starting memory update', {
        memoryId,
        userId: decoded.userId?.toString(),
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });

      // Connect to database
      const { db } = await connectToDatabase();
      const memoriesCollection = db.collection('memories');

      // Find memory by ID to check ownership
      const memory = await memoriesCollection.findOne({ _id: new ObjectId(memoryId) });

      if (!memory) {
        logger.warn('Attempt to update non-existent memory', {
          memoryId,
          userId: decoded.userId?.toString(),
          timestamp: new Date().toISOString()
        });
        
        return vercelResponse.status(404).json({ 
          message: 'Memory not found' 
        });
      }

      // Check if the authenticated user owns this memory or is an admin
      const isOwner = memory.user.equals(decoded.userId);
      const isAdmin = user && user.isAdmin;
      if (!isOwner && !isAdmin) {
        logger.warn('Unauthorized update attempt - user does not own memory and is not admin', {
          userId: decoded.userId?.toString(),
          memoryId,
          isOwner,
          isAdmin,
          timestamp: new Date().toISOString()
        });
        
        return vercelResponse.status(403).json({ 
          message: 'Unauthorized: You do not have permission to update this memory' 
        });
      }

      // Prepare update data
      const updateData: any = {};
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (date) updateData.date = new Date(date);
      updateData.updatedAt = new Date(); // Update the timestamp

      // Update memory in database
      const result = await memoriesCollection.updateOne(
        { _id: new ObjectId(memoryId) },
        { $set: updateData }
      );

      logger.memory('Memory updated successfully', {
        memoryId,
        userId: decoded.userId?.toString(),
        title: updateData.title || memory.title,
        timestamp: new Date().toISOString()
      });

      // Return success response
      return vercelResponse.status(200).json({
        success: true,
        message: 'Memory updated successfully',
        memory: {
          id: new ObjectId(memoryId),
          title: title || memory.title,
          description: description || memory.description,
          date: date ? new Date(date) : memory.date,
          images: memory.images || [],
          user: memory.user,
          createdAt: memory.createdAt,
          updatedAt: updateData.updatedAt
        }
      });
    } catch (error: any) {
      logger.error('Error updating memory', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        memoryId,
        userId: decoded.userId?.toString(),
        payload: {
          title: request.body.title,
          description: request.body.description,
          date: request.body.date
        },
        ip
      });
      
      return vercelResponse.status(500).json({ 
        message: 'Error updating memory',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else if (request.method === 'DELETE') {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authorization token required for memory deletion', {
        memoryId,
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
      logger.warn('Invalid or expired token for memory deletion', {
        memoryId,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      return vercelResponse.status(401).json({
        message: 'Invalid or expired token'
      });
    }

    // Find the user to check if they are an admin
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ _id: decoded.userId });

    try {
      logger.memory('Starting memory deletion', {
        memoryId,
        userId: decoded.userId?.toString(),
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });

      // Connect to database
      const { db } = await connectToDatabase();
      const memoriesCollection = db.collection('memories');

      // Find memory by ID to check ownership
      const memory = await memoriesCollection.findOne({ _id: new ObjectId(memoryId) });

      if (!memory) {
        logger.warn('Attempt to delete non-existent memory', {
          memoryId,
          userId: decoded.userId?.toString(),
          timestamp: new Date().toISOString()
        });
        
        return vercelResponse.status(404).json({ 
          message: 'Memory not found' 
        });
      }

      // Check if the authenticated user owns this memory or is an admin
      const isOwner = memory.user.equals(decoded.userId);
      const isAdmin = user && user.isAdmin;
      if (!isOwner && !isAdmin) {
        logger.warn('Unauthorized deletion attempt - user does not own memory and is not admin', {
          userId: decoded.userId?.toString(),
          memoryId,
          isOwner,
          isAdmin,
          timestamp: new Date().toISOString()
        });
        
        return vercelResponse.status(403).json({ 
          message: 'Unauthorized: You do not have permission to delete this memory' 
        });
      }

      // Delete memory from database
      const result = await memoriesCollection.deleteOne({ _id: new ObjectId(memoryId) });

      logger.memory('Memory deleted successfully', {
        memoryId,
        userId: decoded.userId?.toString(),
        timestamp: new Date().toISOString()
      });

      // Return success response
      return vercelResponse.status(200).json({
        success: true,
        message: 'Memory deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error handling memory request', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        memoryId,
        userId: decoded.userId?.toString(),
        ip
      });
      
      return vercelResponse.status(500).json({ 
        message: 'Error handling memory request',
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