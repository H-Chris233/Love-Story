// Vercel Serverless Function for handling image uploads to GridFS
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import { GridFSBucket, ObjectId } from 'mongodb';
import formidable from 'formidable';
import { Readable } from 'stream';
import logger from '../../lib/logger.js';
import { getClientIP } from '../utils.js';
import type { UploadFields } from '../../src/types/api.js';

// Define interfaces for form data
interface FormDataFields {
  [key: string]: string | string[] | undefined;
}

interface FormDataFiles {
  image?: formidable.File | formidable.File[];
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  const ip = getClientIP(request);

  // Only allow POST requests
  if (request.method !== 'POST') {
    logger.warn('Method not allowed for image upload', {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });
    
    return vercelResponse.status(405).json({ message: 'Method not allowed' });
  }

  try {
    logger.image('Starting image upload process', {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });

    // Connect to database
    const { db } = await connectToDatabase();
    const gfs = new GridFSBucket(db, { bucketName: 'images' });

    // Parse form data
    const form = formidable({
      multiples: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });
    
    // Create a readable stream from the request
    const reqStream = Readable.from(request as unknown as Iterable<unknown>);

    const [fields, files] = await new Promise<[FormDataFields, FormDataFiles]>((resolve, reject) => {
      form.parse(reqStream as unknown as Parameters<typeof form.parse>[0], (err, fields, files) => {
        if (err) {
          logger.error('Error parsing form data:', {
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            ip
          });
          
          reject(err);
        } else {
          resolve([fields, files]);
        }
      });
    });

    // Extract fields
    const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId;
    const memoryId = Array.isArray(fields.memoryId) ? fields.memoryId[0] : fields.memoryId;
    
    // Validate required fields
    if (!userId || !ObjectId.isValid(userId)) {
      logger.warn('Missing or invalid userId in image upload request', {
        userId,
        memoryId,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      return vercelResponse.status(400).json({ 
        message: 'userId is required and must be a valid ObjectId' 
      });
    }
    
    if (!memoryId || !ObjectId.isValid(memoryId)) {
      logger.warn('Missing or invalid memoryId in image upload request', {
        userId,
        memoryId,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      return vercelResponse.status(400).json({ 
        message: 'memoryId is required and must be a valid ObjectId' 
      });
    }

    // Get the image file
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
    
    if (!imageFile) {
      logger.warn('No image file provided in request', {
        userId,
        memoryId,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      return vercelResponse.status(400).json({ message: 'Image file is required' });
    }

    // Validate image file properties
    if (!imageFile.originalFilename || !imageFile.mimetype || !imageFile.filepath) {
      logger.warn('Image file missing required properties', {
        userId,
        memoryId,
        filename: imageFile.originalFilename,
        mimetype: imageFile.mimetype,
        filepath: imageFile.filepath,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      return vercelResponse.status(400).json({ message: 'Invalid image file' });
    }

    // Validate image type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(imageFile.mimetype)) {
      logger.warn('Invalid image type', {
        userId,
        memoryId,
        mimeType: imageFile.mimetype,
        allowedTypes,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      return vercelResponse.status(400).json({ 
        message: `Invalid image type. Allowed types: ${allowedTypes.join(', ')}` 
      });
    }

    logger.image('Processing image file', {
      userId,
      memoryId,
      filename: imageFile.originalFilename,
      size: imageFile.size,
      mimeType: imageFile.mimetype,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    });

    // Create upload stream
    const uploadStream = gfs.openUploadStream(imageFile.originalFilename, {
      contentType: imageFile.mimetype,
      metadata: {
        userId: new ObjectId(userId),
        memoryId: new ObjectId(memoryId),
        uploadedAt: new Date(),
        originalName: imageFile.originalFilename
      }
    });

    // Read the file and pipe it to GridFS
    const fileStream = Readable.from(imageFile as unknown as Iterable<unknown>);
    fileStream.pipe(uploadStream);

    // Handle upload completion
    const uploadResult = await new Promise<{ _id: ObjectId; filename: string; metadata: Record<string, unknown> }>((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', (error) => {
        logger.error('Error uploading image to GridFS', {
          error: error.message,
          stack: error.stack,
          userId,
          memoryId,
          filename: imageFile.originalFilename,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          ip
        });
        
        reject(error);
      });
      fileStream.on('error', (error: Error) => {
        logger.error('Error reading image file stream', {
          error: error.message,
          stack: error.stack,
          userId,
          memoryId,
          filename: imageFile.originalFilename,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          ip
        });
        
        reject(error);
      });
    });

    logger.image('Image uploaded successfully to GridFS', {
      userId,
      memoryId,
      imageId: uploadResult._id.toString(),
      filename: uploadResult.filename,
      size: imageFile.size,
      mimeType: imageFile.mimetype,
      timestamp: new Date().toISOString()
    });

    // Return success response
    return vercelResponse.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageId: uploadResult._id,
      filename: uploadResult.filename,
      metadata: uploadResult.metadata
    });
  } catch (error: unknown) {
    logger.error('Error in image upload handler', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ip
    });

    return vercelResponse.status(500).json({
      message: 'Error uploading image',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
}