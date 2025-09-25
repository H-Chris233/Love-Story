// api/images/upload.ts
// Vercel Serverless Function for handling image uploads
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db';
import jwt from 'jsonwebtoken';
import { Db, ObjectId, GridFSBucket } from 'mongodb';
import formidable from 'formidable';
import { Readable } from 'stream';
import fs from 'fs';

// Define JWT payload type
interface JwtPayload {
  userId: ObjectId;
  iat: number;
  exp: number;
}

interface ImageUploadResult {
  id: string;
  filename: string;
  url: string;
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  // Parse the multipart form data
  const form = formidable({
    multiples: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB max file size
    uploadDir: '/tmp', // Temporary directory
    keepExtensions: true,
  });

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

    // Parse form data
    const [fields, files] = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
      form.parse(request, (err, fields, files) => {
        if (err) {
          console.error('Error parsing form data:', err);
          reject(err);
        } else {
          resolve({ fields, files });
        }
      });
    });

    // Check if files were uploaded
    if (!files.image) {
      return vercelResponse.status(400).json({
        message: 'Please upload an image file'
      });
    }

    // Handle single or multiple file uploads
    const imageFiles = Array.isArray(files.image) ? files.image : [files.image];
    
    if (imageFiles.length === 0) {
      return vercelResponse.status(400).json({
        message: 'Please upload at least one image file'
      });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    
    // Create GridFS bucket for file storage
    const bucket = new GridFSBucket(db, { bucketName: 'images' });

    const uploadResults: ImageUploadResult[] = [];

    // Process each uploaded image
    for (const imageFile of imageFiles) {
      if (!imageFile) continue;

      // Create a readable stream from the uploaded file
      const fileStream = fs.createReadStream(imageFile.filepath);
      
      // Generate a unique filename with user ID and timestamp
      const fileExtension = imageFile.originalFilename?.split('.').pop() || 'jpg';
      const filename = `user_${decoded.userId}_${Date.now()}_${imageFile.newFilename}.${fileExtension}`;
      
      // Upload to GridFS
      const uploadStream = bucket.openUploadStream(filename);
      
      await new Promise<void>((resolve, reject) => {
        fileStream.pipe(uploadStream)
          .on('error', (error) => {
            console.error('Error uploading to GridFS:', error);
            reject(error);
          })
          .on('finish', () => {
            console.log(`File uploaded successfully: ${filename}`);
            resolve();
          });
      });

      // Add upload result
      uploadResults.push({
        id: uploadStream.id.toString(),
        filename,
        url: `/api/images/${uploadStream.id}`
      });
    }

    // Clean up temporary files
    for (const imageFile of imageFiles) {
      if (imageFile && imageFile.filepath) {
        fs.unlink(imageFile.filepath, (err) => {
          if (err) {
            console.error('Error deleting temp file:', err);
          }
        });
      }
    }

    // Return success response with upload results
    return vercelResponse.status(200).json({
      success: true,
      message: `Successfully uploaded ${uploadResults.length} image(s)`,
      results: uploadResults
    });
  } catch (error: any) {
    console.error('Error in image upload handler:', error);
    
    return vercelResponse.status(500).json({
      message: 'Internal server error during image upload',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}