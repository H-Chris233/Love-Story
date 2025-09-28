// api/memories/[id].ts
// Vercel Serverless Function for getting, updating, and deleting a specific memory
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import logger from '../../lib/logger.js';
import { getClientIP } from '../utils.js';

// Define JWT payload type
interface JwtPayload {
  userId: string | ObjectId;
  iat: number;
  exp: number;
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
        { _id: new ObjectId(memory.user.toString()) },
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
    } catch (error: unknown) {
      logger.error('Error fetching memory', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        memoryId,
        ip
      });
      
      return vercelResponse.status(500).json({ 
        message: 'Error fetching memory',
        error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
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
    } catch (error: unknown) {
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
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId.toString()) });

    // For file uploads, we need to parse multipart/form-data
    const contentType = request.headers['content-type'];
    let title: string, description: string, date: string;

    if (contentType && contentType.includes('multipart/form-data')) {
      // Parse multipart/form-data using formidable
      const { formidable } = await import('formidable');
      
      try {
        const form = formidable({ 
          multiples: true,
          keepExtensions: true
        });
        
        // Parse the form data
        const [fields, fileFields] = await new Promise<[Record<string, string | string[] | undefined>, Record<string, any>]>((resolve, reject) => {
          form.parse(request as unknown as Parameters<typeof form.parse>[0], (err, fields, files) => {
            if (err) reject(err);
            else resolve([fields, files]);
          });
        });
        
        // Extract fields
        title = Array.isArray(fields.title) ? fields.title[0] : (fields.title || '');
        description = Array.isArray(fields.description) ? fields.description[0] : (fields.description || '');
        date = Array.isArray(fields.date) ? fields.date[0] : (fields.date || '');
        
      } catch (parseError: unknown) {
        logger.error('Error parsing form data', {
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          ip
        });
        
        return vercelResponse.status(400).json({ 
          message: 'Error parsing form data'
        });
      }
    } else {
      // For JSON requests, use normal destructuring
      if (!request.body) {
        logger.warn('Request body is required for memory update', {
          memoryId,
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          userId: decoded.userId?.toString(),
          ip
        });
        
        return vercelResponse.status(400).json({ 
          message: 'Request body is required for memory update'
        });
      }
      
      ({ title, description, date } = request.body);
    }

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
      const isOwner = memory.user.toString() === decoded.userId.toString();
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
      const updateData: { [key: string]: unknown } & { updatedAt: Date } = {
        updatedAt: new Date()
      };
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (date) updateData.date = new Date(date);
      // updatedAt is already set in the initial object

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
    } catch (error: unknown) {
      logger.error('Error updating memory', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        memoryId,
        userId: decoded.userId?.toString(),
        payload: {
          title: request.body?.title || title || 'undefined',
          description: request.body?.description || description || 'undefined',
          date: request.body?.date || date || 'undefined'
        },
        ip
      });
      
      return vercelResponse.status(500).json({ 
        message: 'Error updating memory',
        error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
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
    } catch (error: unknown) {
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
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId.toString()) });

    try {
      logger.memory('Starting memory deletion', {
        memoryId,
        userId: decoded.userId?.toString(),
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });

      // Use existing database connection
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
      const isOwner = memory.user.toString() === decoded.userId.toString();
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
    } catch (error: unknown) {
      logger.error('Error handling memory request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        memoryId,
        userId: decoded.userId?.toString(),
        ip
      });
      
      return vercelResponse.status(500).json({ 
        message: 'Error handling memory request',
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