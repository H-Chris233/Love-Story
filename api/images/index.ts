// api/images/index.ts
// Vercel Serverless Function for getting all images associated with memories
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
  // Only allow GET requests
  if (request.method !== 'GET') {
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  try {
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
    } catch (_error: unknown) {
      return vercelResponse.status(401).json({
        message: 'Invalid or expired token'
      });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    
    // Find all memories that have images
    const memoriesCollection = db.collection('memories');
    const memoriesWithImages = await memoriesCollection
      .find({ 
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

    return vercelResponse.status(200).json({
      success: true,
      images: allImages,
      count: allImages.length
    });
  } catch (error: unknown) {
    console.error('❌ [IMAGES] Error in images index handler:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      userId: (request.headers.authorization || '').substring(0, 20) + '...',
      ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress
    });
    
    return vercelResponse.status(500).json({
      message: 'Internal server error while fetching images',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
}