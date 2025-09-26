// api/images/upload.ts
// Vercel Serverless Function for uploading images
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';

// Define image upload result type
interface ImageUploadResult {
  url: string;
  publicId: string;
}

/**
 * Upload an image to GridFS
 * @param buffer - The image buffer to upload
 * @param originalName - The original name of the file
 * @param mimeType - The MIME type of the file
 * @returns The upload result containing URL and public ID
 */
async function uploadImage(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<ImageUploadResult> {
  try {
    const { db } = await connectToDatabase();
    
    // Create a GridFS bucket
    const bucket = new GridFSBucket(db, { bucketName: 'images' });
    
    // Generate a unique filename
    const filename = `${Date.now()}-${originalName}`;
    
    // Upload the image to GridFS
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimeType,
      metadata: {
        originalName,
        uploadDate: new Date(),
      }
    });
    
    // Write the buffer to the upload stream
    const result = await new Promise<ObjectId>((resolve, reject) => {
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => resolve(uploadStream.id));
      uploadStream.end(buffer);
    });
    
    // Return the result with the image ID as the public ID
    return {
      url: `/api/images/${result}`, // This would be the path to retrieve the image
      publicId: result.toString()
    };
  } catch (error) {
    console.error('Error uploading image to GridFS:', error);
    throw new Error(`Failed to upload image: ${(error as Error).message}`);
  }
}

// Define image upload result type
interface ImageUploadResult {
  url: string;
  publicId: string;
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  // This endpoint only accepts POST requests
  if (request.method !== 'POST') {
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  try {
    // Check if the request has the correct content type for file uploads
    const contentType = request.headers['content-type'];
    if (!contentType || !contentType.startsWith('multipart/form-data')) {
      return vercelResponse.status(400).json({
        message: 'Content-Type must be multipart/form-data'
      });
    }

    console.log('🖼️ [IMAGE] Starting image upload process');

    // In a serverless environment, we need to parse the multipart form data manually
    // This is a simplified approach - in a real implementation you'd use a library like busboy
    // For now, we'll assume the image data is sent in a specific format in the request body
    
    // Get the image data from the request body
    const { imageBuffer, imageName, imageType } = request.body;

    if (!imageBuffer || !imageName || !imageType) {
      console.log('❌ [IMAGE] Missing required fields in image upload request');
      return vercelResponse.status(400).json({
        message: 'Image buffer, name, and type are required',
        missingFields: [
          !imageBuffer && 'imageBuffer',
          !imageName && 'imageName', 
          !imageType && 'imageType'
        ].filter(Boolean)
      });
    }

    // Convert base64 image buffer to actual buffer if needed
    let imageBufferData: Buffer;
    if (typeof imageBuffer === 'string') {
      // If it's a base64 string, convert to buffer
      imageBufferData = Buffer.from(imageBuffer, 'base64');
    } else if (imageBuffer instanceof Buffer) {
      imageBufferData = imageBuffer;
    } else {
      return vercelResponse.status(400).json({
        message: 'Invalid image buffer format'
      });
    }

    console.log(`🖼️ [IMAGE] Processing file: ${imageName}, Size: ${imageBufferData.length} bytes, Type: ${imageType}`);

    // Upload the image to storage (GridFS in this case)
    const uploadResult: ImageUploadResult = await uploadImage(
      imageBufferData,
      imageName,
      imageType
    );

    console.log(`✅ [IMAGE] Image uploaded successfully:`, uploadResult);

    return vercelResponse.status(200).json({
      message: 'Image uploaded successfully',
      image: uploadResult
    });
  } catch (error: any) {
    console.error('❌ [IMAGE] Error uploading image:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress
    });

    return vercelResponse.status(500).json({
      message: 'Error uploading image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}