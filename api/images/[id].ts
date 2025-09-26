// api/images/[id].ts
// Vercel Serverless Function for retrieving or deleting an image
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deleteImage, getImage } from '../utils/imageUpload.js';
import { ObjectId } from 'mongodb';

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  const { id } = request.query;
  
  // Validate image ID
  if (!id || Array.isArray(id) || !ObjectId.isValid(id)) {
    return vercelResponse.status(400).json({ 
      message: 'Valid image ID required' 
    });
  }
  
  const imageId = id as string;

  if (request.method === 'GET') {
    // Retrieve an image
    try {
      // Get the image from storage
      const image = await getImage(imageId);
      
      // Set the appropriate content type
      vercelResponse.setHeader('Content-Type', image.contentType);
      
      // In a real implementation, you'd stream the image data
      // For now, return a placeholder response
      return vercelResponse.status(200).json({
        message: 'Image retrieved successfully',
        image: {
          id: imageId,
          filename: image.filename,
          contentType: image.contentType,
          uploadDate: image.uploadDate
        }
      });
    } catch (error: any) {
      console.error('❌ [IMAGE] Error retrieving image:', {
        error: error.message,
        imageId,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress
      });

      return vercelResponse.status(404).json({
        message: 'Image not found',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else if (request.method === 'DELETE') {
    // Delete an image
    try {
      console.log(`🗑️ [IMAGE] Deleting image with ID: ${imageId}`);
      
      // Delete the image from storage
      await deleteImage(imageId);
      
      console.log(`✅ [IMAGE] Image deleted successfully: ${imageId}`);
      
      return vercelResponse.status(200).json({
        message: 'Image deleted successfully',
        imageId
      });
    } catch (error: any) {
      console.error('❌ [IMAGE] Error deleting image:', {
        error: error.message,
        imageId,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress
      });

      return vercelResponse.status(500).json({
        message: 'Error deleting image',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else {
    // Method not allowed
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }
}