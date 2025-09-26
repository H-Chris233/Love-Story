// api/images/upload.ts
// Vercel Serverless Function for uploading images
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { uploadImage } from '../utils/imageUpload.js';
import { Readable } from 'stream';

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