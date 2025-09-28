// api/memories/index.ts
// Vercel Serverless Function for getting all memories and creating a new one
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import jwt from 'jsonwebtoken';
import { Db, ObjectId } from 'mongodb';
import logger from '../../lib/logger.js';
import { getClientIP } from '../utils.js';
import type { AppError, UploadedFile, UploadFields } from '../../src/types/api.js';

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
        memories.map(async (memory) => {
          const memoryDoc = memory as any;
          const user = await usersCollection.findOne(
            { _id: memoryDoc.user },
            { projection: { name: 1, email: 1 } }
          );
          
          return {
            _id: memoryDoc._id,
            title: memoryDoc.title,
            description: memoryDoc.description,
            date: memoryDoc.date,
            images: memoryDoc.images || [],
            user: user ? {
              _id: user._id,
              name: (user as any).name,
              email: (user as any).email
            } : null,
            createdAt: memoryDoc.createdAt,
            updatedAt: memoryDoc.updatedAt
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
    } catch (error: unknown) {
      logger.error('Error fetching memories', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip
      });
      
      return vercelResponse.status(500).json({ 
        message: 'Error fetching memories',
        error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
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

    // For file uploads, we need to parse multipart/form-data
    const contentType = request.headers['content-type'];
    let title: string, description: string, date: string;
    let files: UploadedFile[] = [];

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
        
        // Extract files
        if (fileFields.images) {
          files = Array.isArray(fileFields.images) ? fileFields.images : [fileFields.images];
        }
        
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
      ({ title, description, date } = request.body);
    }

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
        contentType: request.headers['content-type'],
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

      // Create new memory object (without images first)
      const newMemory: Memory = {
        title,
        description,
        date: new Date(date), // Ensure date is a proper Date object
        images: [], // Initialize with empty images array
        user: decoded.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Insert new memory into database first
      const result = await memoriesCollection.insertOne(newMemory);
      const memoryId = result.insertedId;

      // Handle file uploads if any
      const uploadedImages = [];
      if (files.length > 0) {
        logger.memory('Processing file uploads for memory', {
          memoryId: memoryId.toString(),
          fileCount: files.length,
          fileNames: files.map((f: UploadedFile) => f.originalFilename || f.name),
          timestamp: new Date().toISOString()
        });

        // Upload each file to GridFS
        const { GridFSBucket } = await import('mongodb');
        const gfs = new GridFSBucket(db, { bucketName: 'images' });

        for (const file of files) {
          try {
            // Create upload stream
            const uploadStream = gfs.openUploadStream((file as any).originalFilename || `memory_${memoryId}_${Date.now()}`, {
              contentType: (file as any).mimetype,
              metadata: {
                userId: decoded.userId,
                memoryId: memoryId,
                uploadedAt: new Date(),
                originalName: (file as any).originalFilename
              }
            });

            // Read the file and pipe it to GridFS
            const fileStream = Readable.from(file as unknown as Iterable<unknown>);
            fileStream.pipe(uploadStream);

            // Wait for upload completion
            await new Promise<void>((resolve, reject) => {
              uploadStream.on('finish', () => resolve());
              uploadStream.on('error', reject);
              fileStream.on('error', reject);
            });

            // Add image info to uploaded images array
            uploadedImages.push({
              url: `/api/images/${uploadStream.id}`,
              publicId: uploadStream.id.toString()
            });

            logger.memory('Image uploaded to GridFS successfully', {
              memoryId: memoryId.toString(),
              imageId: uploadStream.id.toString(),
              filename: file.originalFilename,
              timestamp: new Date().toISOString()
            });

          } catch (uploadError: unknown) {
            logger.error('Error uploading image to GridFS', {
              error: uploadError instanceof Error ? uploadError.message : 'Unknown error',
              memoryId: memoryId.toString(),
              filename: (file as any).originalFilename,
              timestamp: new Date().toISOString()
            });
          }
        }

        // Update memory with uploaded images
        if (uploadedImages.length > 0) {
          await memoriesCollection.updateOne(
            { _id: memoryId },
            { 
              $set: { 
                images: uploadedImages,
                updatedAt: new Date()
              }
            }
          );
        }
      }

      // Get the updated memory with images
      const updatedMemory = await memoriesCollection.findOne({ _id: memoryId });

      logger.memory('Memory created successfully', {
        memoryId: memoryId.toString(),
        userId: decoded.userId?.toString(),
        title: newMemory.title,
        imageCount: uploadedImages.length,
        timestamp: new Date().toISOString()
      });

      // Return success response with the created memory
      return vercelResponse.status(201).json({
        success: true,
        message: 'Memory created successfully',
        memory: {
          id: memoryId,
          title: newMemory.title,
          description: newMemory.description,
          date: newMemory.date,
          images: uploadedImages.length > 0 ? uploadedImages : [],
          user: decoded.userId,
          createdAt: newMemory.createdAt,
          updatedAt: new Date()
        }
      });
    } catch (error: unknown) {
      logger.error('Error creating memory', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
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