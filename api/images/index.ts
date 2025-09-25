// api/images/index.ts
// Vercel Serverless Function for getting all images for a user
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db';
import jwt from 'jsonwebtoken';
import { Db, GridFSBucket, ObjectId } from 'mongodb';

// Define JWT payload type
interface JwtPayload {
  userId: ObjectId;
  iat: number;
  exp: number;
}

interface ImageFile {
  id: string;
  filename: string;
  uploadDate: Date;
  contentType: string;
  size: number;
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
    } catch (error) {
      return vercelResponse.status(401).json({
        message: 'Invalid or expired token'
      });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    
    // Create GridFS bucket for file storage
    const bucket = new GridFSBucket(db, { bucketName: 'images' });

    // Find all images for the user based on filename pattern
    // The images are stored with a pattern: user_{userId}_{timestamp}_{randomId}.{ext}
    const pattern = new RegExp(`^user_${decoded.userId.toString()}_`);
    
    const imageFiles = await bucket.find({ 
      filename: { $regex: pattern } 
    }).sort({ uploadDate: -1 }).toArray();

    // Format the response
    const images: ImageFile[] = imageFiles.map(file => ({
      id: file._id.toString(),
      filename: file.filename,
      uploadDate: file.uploadDate,
      contentType: file.contentType || 'application/octet-stream',
      size: file.length
    }));

    return vercelResponse.status(200).json({
      success: true,
      images,
      count: images.length
    });
  } catch (error: any) {
    console.error('Error in images index handler:', error);
    
    return vercelResponse.status(500).json({
      message: 'Internal server error while fetching images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}