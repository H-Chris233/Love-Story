// api/images/index.ts
// Vercel Serverless Function for handling all image operations
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import { GridFSBucket, ObjectId } from 'mongodb';
import formidable from 'formidable';
import { Readable } from 'stream';
import jwt from 'jsonwebtoken';
import logger from '../../lib/logger.js';
import { getClientIP } from '../utils.js';
import type { UploadFields } from '../../src/types/api.js';

// Define JWT payload type
interface JwtPayload {
  userId: ObjectId;
  iat: number;
  exp: number;
}

// Define interfaces for form data
interface FormDataFields {
  [key: string]: string | string[] | undefined;
}

interface FormDataFiles {
  image?: formidable.File | formidable.File[];
}

interface ImageInfo {
  url: string;
  publicId: string;
}

interface MemoryWithImages {
  _id: ObjectId;
  title: string;
  description: string;
  date: Date;
  images: ImageInfo[];
  user: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface ImageFile {
  id: string;
  url: string;
  memoryId: string;
  memoryTitle: string;
  uploadDate: Date;
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  const ip = getClientIP(request);

  if (request.method === 'GET') {
    // Handle GET request - fetch all images
    await handleGetImages(request, vercelResponse, ip);
  } else if (request.method === 'POST') {
    // Handle POST request - upload new image
    await handleUploadImage(request, vercelResponse, ip);
  } else {
    // Method not allowed
    logger.warn('Method not allowed for images endpoint', {
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

async function handleGetImages(request: VercelRequest, vercelResponse: VercelResponse, ip: string) {
  try {
    logger.image('Fetching all images', {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });

    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authorization token required for images access', {
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
    } catch (_error: unknown) {
      logger.warn('Invalid or expired token for images access', {
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
    
    // Find all memories that have images and belong to the authenticated user
    const memoriesCollection = db.collection('memories');
    const memoriesWithImages = await memoriesCollection
      .find({ 
        user: decoded.userId, // Only memories belonging to the authenticated user
        images: { $exists: true, $ne: [] } // Only memories with images
      })
      .toArray();

    // Extract all images from memories
    const allImages: ImageFile[] = [];
    for (const memory of memoriesWithImages) {
      for (const image of memory.images) {
        allImages.push({
          id: image.publicId,
          url: image.url,
          memoryId: memory._id.toString(),
          memoryTitle: memory.title,
          uploadDate: memory.createdAt // Use memory creation date as upload date
        });
      }
    }

    logger.image(`Successfully fetched ${allImages.length} images`, {
      count: allImages.length,
      timestamp: new Date().toISOString()
    });

    return vercelResponse.status(200).json({
      success: true,
      images: allImages,
      count: allImages.length
    });
  } catch (error: unknown) {
    logger.error('Error in images GET handler', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ip
    });
    
    return vercelResponse.status(500).json({
      message: 'Internal server error while fetching images',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
}

async function handleUploadImage(request: VercelRequest, vercelResponse: VercelResponse, ip: string) {
  try {
    logger.image('Starting image upload process', {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });

    // Check authentication
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authorization token required for image upload', {
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
      logger.warn('Invalid or expired token for image upload', {
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
    const gfs = new GridFSBucket(db, { bucketName: 'images' });

    // Parse form data
    const form = formidable({
      multiples: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });
    
    // Parse form data directly from the request
    const [fields, files] = await new Promise<[FormDataFields, FormDataFiles]>((resolve, reject) => {
      form.parse(request, (err, fields, files) => {
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
    const memoryId = Array.isArray(fields.memoryId) ? fields.memoryId[0] : fields.memoryId;
    
    // Use userId from JWT token for authentication
    const userId = decoded.userId.toString();
    
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

    // Verify that the memory exists and belongs to the user
    const memoriesCollection = db.collection('memories');
    const memoryObjectId = new ObjectId(memoryId);
    const memory = await memoriesCollection.findOne({ 
      _id: memoryObjectId,
      user: decoded.userId // Verify ownership
    });

    if (!memory) {
      logger.warn('Memory not found or access denied for image upload', {
        userId,
        memoryId,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      return vercelResponse.status(404).json({ 
        message: 'Memory not found or access denied' 
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

    // Read the file and pipe it to GridFS using fs.createReadStream
    const fs = await import('fs');
    const fileStream = fs.createReadStream(imageFile.filepath);
    fileStream.pipe(uploadStream);

    // Handle upload completion
    const uploadResult = await new Promise<{ _id: ObjectId; filename: string }>((resolve, reject) => {
      uploadStream.on('finish', () => resolve({ _id: uploadStream.id, filename: uploadStream.filename }));
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

    // Update the memory to include the new image
    const memoriesCollection = db.collection('memories');
    const memoryObjectId = new ObjectId(memoryId);
    
    // Create image info for the memory
    const newImageInfo = {
      url: `/api/images/${uploadResult._id}`,
      publicId: uploadResult._id.toString()
    };
    
    // Add the image to the memory's images array
    await memoriesCollection.updateOne(
      { _id: memoryObjectId },
      { 
        $push: { images: newImageInfo },
        $set: { updatedAt: new Date() }
      }
    );

    logger.image('Image uploaded successfully to GridFS and memory updated', {
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
      imageUrl: newImageInfo.url
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