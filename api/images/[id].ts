// api/images/[id].ts
// Vercel Serverless Function for serving, updating, or deleting a specific image
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

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  const { id } = request.query;
  
  // Validate image ID
  if (!id || Array.isArray(id) || !ObjectId.isValid(id)) {
    return vercelResponse.status(400).json({ 
      message: 'Valid image ID required' 
    });
  }
  
  const imageId = new ObjectId(id);
  
  // Extract token from Authorization header for non-GET requests
  const authHeader = request.headers.authorization;
  let decoded: JwtPayload | null = null;
  
  if (request.method !== 'GET') {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return vercelResponse.status(401).json({
        message: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
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
  }

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Create GridFS bucket for file storage
    const bucket = new GridFSBucket(db, { bucketName: 'images' });

    if (request.method === 'GET') {
      // Serve the image
      // Check if the file exists
      const file = await bucket.find({ _id: imageId }).toArray();
      if (!file || file.length === 0) {
        return vercelResponse.status(404).json({
          message: 'Image not found'
        });
      }

      // Get file stream
      const downloadStream = bucket.openDownloadStream(imageId);

      // Set headers for image response
      vercelResponse.setHeader('Content-Type', file[0].contentType || 'application/octet-stream');
      vercelResponse.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      vercelResponse.setHeader('Content-Disposition', `inline; filename="${file[0].filename}"`);

      // Pipe the file stream to the response
      downloadStream.pipe(vercelResponse);

      // Handle errors in the download stream
      downloadStream.on('error', (error) => {
        console.error('Error downloading file from GridFS:', error);
        vercelResponse.status(500).json({
          message: 'Internal server error while downloading image',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      });
    } 
    else if (request.method === 'DELETE') {
      // Delete an image
      if (!decoded) {
        return vercelResponse.status(401).json({ message: 'Authorization token required' });
      }
      
      // Find the image to delete
      const image = await bucket.find({ _id: imageId }).toArray();
      
      if (!image || image.length === 0) {
        return vercelResponse.status(404).json({
          message: 'Image not found'
        });
      }
      
      // Verify that the image belongs to the user
      const filename = image[0].filename;
      const expectedPattern = `user_${decoded.userId.toString()}_`;
      
      if (!filename.startsWith(expectedPattern)) {
        return vercelResponse.status(403).json({
          message: 'Not authorized to delete this image'
        });
      }

      // Delete the image from GridFS
      await bucket.delete(imageId);

      // Return success response
      return vercelResponse.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      });
    } 
    else {
      // Method not allowed
      return vercelResponse.status(405).json({ 
        message: 'Method not allowed' 
      });
    }
  } catch (error: any) {
    console.error('Error in image handler:', error);
    
    return vercelResponse.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}