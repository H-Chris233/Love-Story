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
          _id: memory._id,
          title: memory.title,
          description: memory.description,
          date: memory.date,
          images: memory.images || [],
          user: user ? {
            _id: user._id,
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
    let uploadedFiles: any[] = [];
    let imagesToDelete: string[] = [];

    if (contentType && contentType.includes('multipart/form-data')) {
      // Parse multipart/form-data using formidable with Vercel-compatible approach
      try {
        const { formidable } = await import('formidable');
        
        const form = formidable({ 
          multiples: true,
          keepExtensions: true
        });
        
        // Parse the form data
        const [fields, fileFields] = await new Promise<[Record<string, string | string[] | undefined>, Record<string, any>]>((resolve, reject) => {
          form.parse(request, (err, fields, files) => {
            if (err) reject(err);
            else resolve([fields, files]);
          });
        });
        
        // Extract fields
        title = Array.isArray(fields.title) ? fields.title[0] : (fields.title || '');
        description = Array.isArray(fields.description) ? fields.description[0] : (fields.description || '');
        date = Array.isArray(fields.date) ? fields.date[0] : (fields.date || '');
        
        // Extract imagesToDelete if provided
        if (fields.imagesToDelete) {
          const imagesToDeleteStr = Array.isArray(fields.imagesToDelete) ? fields.imagesToDelete[0] : fields.imagesToDelete;
          if (imagesToDeleteStr) {
            try {
              imagesToDelete = JSON.parse(imagesToDeleteStr);
              logger.memory('Images marked for deletion', {
                memoryId,
                imagesToDelete,
                timestamp: new Date().toISOString()
              });
            } catch (parseError: unknown) {
              logger.error('Error parsing imagesToDelete', {
                error: parseError instanceof Error ? parseError.message : 'Unknown error',
                imagesToDeleteRaw: imagesToDeleteStr,
                timestamp: new Date().toISOString()
              });
              
              return vercelResponse.status(400).json({ 
                message: 'Invalid imagesToDelete format',
                error: process.env.NODE_ENV === 'development' && parseError instanceof Error ? parseError.message : undefined
              });
            }
          }
        }
        
        // Extract files
        if (fileFields.images) {
          uploadedFiles = Array.isArray(fileFields.images) ? fileFields.images : [fileFields.images];
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
      
      ({ title, description, date, imagesToDelete = [] } = request.body);
    }

    // Validate request data
    if (!title && !description && !date && uploadedFiles.length === 0 && imagesToDelete.length === 0) {
      logger.warn('No data provided for memory update', {
        memoryId,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        userId: decoded.userId?.toString(),
        ip
      });
      
      return vercelResponse.status(400).json({ 
        message: 'No data provided for update',
        memoryId
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
          message: 'Memory not found',
          memoryId: memoryId 
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
        
        return vercelResponse.status(401).json({ 
          message: 'Not authorized - only the creator or admin can edit this memory',
          authorized: false,
          userId: decoded.userId?.toString(),
          memoryId: memoryId
        });
      }

      // Get existing images and filter out the ones marked for deletion
      let updatedImages = memory.images ? [...memory.images] : [];
      if (imagesToDelete.length > 0) {
        // Delete specified images from MongoDB GridFS
        const { GridFSBucket } = await import('mongodb');
        const gfs = new GridFSBucket(db, { bucketName: 'images' });

        for (const publicId of imagesToDelete) {
          logger.memory('Deleting image from GridFS', {
            memoryId,
            imageId: publicId,
            timestamp: new Date().toISOString()
          });

          try {
            // Convert publicId to ObjectId for GridFS deletion
            await gfs.delete(new ObjectId(publicId));
            
            // Remove from updatedImages array
            updatedImages = updatedImages.filter(img => img.publicId !== publicId);
            
            logger.memory('Image deleted successfully from GridFS', {
              memoryId,
              imageId: publicId,
              timestamp: new Date().toISOString()
            });
          } catch (deleteError: unknown) {
            logger.error('Error deleting image from GridFS', {
              error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
              publicId: publicId,
              timestamp: new Date().toISOString()
            });
            
            // Continue processing other images even if one fails
          }
        }
      }

      // Upload new images if provided
      const { GridFSBucket } = await import('mongodb');
      const gfs = new GridFSBucket(db, { bucketName: 'images' });

      if (uploadedFiles.length > 0) {
        logger.memory('Processing new image uploads for memory update', {
          memoryId,
          fileCount: uploadedFiles.length,
          fileNames: uploadedFiles.map((f: any) => f.originalFilename || f.name),
          timestamp: new Date().toISOString()
        });

        for (const file of uploadedFiles) {
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
            // Using fs.createReadStream to properly handle file data from formidable
            const fs = await import('fs');
            const fileStream = fs.createReadStream((file as any).filepath);
            fileStream.pipe(uploadStream);

            // Wait for upload completion
            await new Promise<void>((resolve, reject) => {
              uploadStream.on('finish', () => resolve());
              uploadStream.on('error', reject);
              fileStream.on('error', reject);
            });

            // Add image info to updated images array
            updatedImages.push({
              url: `/api/images/${uploadStream.id}`,
              publicId: uploadStream.id.toString()
            });

            logger.memory('New image uploaded to GridFS successfully', {
              memoryId,
              imageId: uploadStream.id.toString(),
              filename: (file as any).originalFilename,
              timestamp: new Date().toISOString()
            });

          } catch (uploadError: unknown) {
            logger.error('Error uploading new image to GridFS', {
              error: uploadError instanceof Error ? uploadError.message : 'Unknown error',
              memoryId: memoryId,
              filename: (file as any).originalFilename,
              timestamp: new Date().toISOString()
            });
            
            // If an image fails to upload, return an error
            return vercelResponse.status(500).json({ 
              message: `Error uploading new image: ${(file as any).originalFilename}`,
              error: process.env.NODE_ENV === 'development' && uploadError instanceof Error ? uploadError.message : undefined
            });
          }
        }
      }

      // Prepare update data
      const updateData: { [key: string]: unknown } & { updatedAt: Date } = {
        updatedAt: new Date()
      };
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (date) updateData.date = new Date(date);
      if (updatedImages.length > 0) updateData.images = updatedImages; // Update images array if it changed

      // Update memory in database
      const result = await memoriesCollection.updateOne(
        { _id: new ObjectId(memoryId) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        logger.error('Failed to update memory (update returned no match):', {
          memoryId: memoryId,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          userId: decoded.userId?.toString(),
          ip
        });
        return vercelResponse.status(500).json({ 
          message: 'Failed to update memory in database',
          memoryId: memoryId
        });
      }

      logger.memory('Memory updated successfully', {
        memoryId,
        userId: decoded.userId?.toString(),
        title: updateData.title || memory.title,
        timestamp: new Date().toISOString()
      });

      // Get updated memory document
      const updatedMemory = await memoriesCollection.findOne({ _id: new ObjectId(memoryId) });

      // Get updated user information
      const updatedUser = await usersCollection.findOne(
        { _id: new ObjectId(memory.user.toString()) },
        { projection: { name: 1, email: 1 } }
      );

      // Return success response
      return vercelResponse.status(200).json({
        success: true,
        message: 'Memory updated successfully',
        memory: {
          _id: updatedMemory!._id,
          title: updatedMemory!.title,
          description: updatedMemory!.description,
          date: updatedMemory!.date,
          images: updatedMemory!.images || [],
          user: updatedUser ? {
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email
          } : null,
          createdAt: updatedMemory!.createdAt,
          updatedAt: updatedMemory!.updatedAt
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

      // Find memory by ID to check ownership and get images info
      const memory = await memoriesCollection.findOne({ _id: new ObjectId(memoryId) });

      if (!memory) {
        logger.warn('Attempt to delete non-existent memory', {
          memoryId,
          userId: decoded.userId?.toString(),
          timestamp: new Date().toISOString()
        });
        
        return vercelResponse.status(404).json({ 
          message: 'Memory not found',
          memoryId: memoryId 
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
        
        return vercelResponse.status(401).json({ 
          message: 'Not authorized - only the creator or admin can delete this memory',
          authorized: false,
          userId: decoded.userId?.toString(),
          memoryId: memoryId
        });
      }

      // Delete images from MongoDB GridFS if any exist
      if (memory.images && memory.images.length > 0) {
        logger.memory(`Deleting ${memory.images.length} images from GridFS...`, {
          memoryId,
          imageCount: memory.images.length,
          timestamp: new Date().toISOString()
        });

        const { GridFSBucket } = await import('mongodb');
        const gfs = new GridFSBucket(db, { bucketName: 'images' });

        for (const image of memory.images) {
          logger.memory('Deleting image from GridFS', {
            memoryId,
            imageId: image.publicId,
            timestamp: new Date().toISOString()
          });

          try {
            // Convert publicId to ObjectId for GridFS deletion
            await gfs.delete(new ObjectId(image.publicId));
            
            logger.memory('GridFS image deleted successfully', {
              memoryId,
              imageId: image.publicId,
              timestamp: new Date().toISOString()
            });
          } catch (deleteError: unknown) {
            logger.error('Error deleting image from GridFS', {
              error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
              publicId: image.publicId,
              timestamp: new Date().toISOString()
            });
            
            // Continue even if image deletion fails
          }
        }
      }

      // Delete memory from database
      const result = await memoriesCollection.deleteOne({ _id: new ObjectId(memoryId) });

      if (result.deletedCount === 0) {
        logger.error('Failed to delete memory (delete returned no match):', {
          memoryId: memoryId,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          userId: decoded.userId?.toString(),
          ip
        });
        return vercelResponse.status(500).json({ 
          message: 'Failed to delete memory from database',
          memoryId: memoryId
        });
      }

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