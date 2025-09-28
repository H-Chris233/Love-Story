// api/images/[id].ts
// Vercel Serverless Function for retrieving or deleting an image
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import { GridFSBucket, ObjectId } from 'mongodb';

/**
 * Delete an image from GridFS
 * @param publicId - The public ID of the image to delete
 */
async function deleteImage(publicId: string): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    
    // Create a GridFS bucket
    const bucket = new GridFSBucket(db, { bucketName: 'images' });
    
    // Convert the publicId string back to ObjectId
    const fileId = new ObjectId(publicId);
    
    // Delete the file from GridFS
    await bucket.delete(fileId);
    
    console.log(`Image with ID ${publicId} deleted from GridFS`);
  } catch (error) {
    console.error(`Error deleting image with ID ${publicId} from GridFS:`, error);
    throw new Error(`Failed to delete image: ${(error as Error).message}`);
  }
}

/**
 * Get an image from GridFS and stream it to response
 * @param publicId - The public ID of the image to retrieve
 * @param response - The Vercel response object to stream the image to
 */
async function getImage(publicId: string, response: VercelResponse) {
  try {
    const { db } = await connectToDatabase();
    
    // Create a GridFS bucket
    const bucket = new GridFSBucket(db, { bucketName: 'images' });
    
    // Convert the publicId string back to ObjectId
    const fileId = new ObjectId(publicId);
    
    // Find the file in GridFS
    const files = await bucket.find({ _id: fileId }).limit(1).toArray();
    
    if (files.length === 0) {
      throw new Error('File not found');
    }
    
    const file = files[0];
    
    // Set appropriate headers
    if (file.contentType) {
      response.setHeader('Content-Type', file.contentType);
    }
    
    // Set cache headers for better performance
    response.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    response.setHeader('Last-Modified', file.uploadDate?.toUTCString() || new Date().toUTCString());
    
    // Create download stream and pipe to response
    const downloadStream = bucket.openDownloadStream(fileId);
    
    return new Promise<void>((resolve, reject) => {
      downloadStream.pipe(response);
      
      downloadStream.on('end', () => {
        console.log(`✅ [IMAGE] Image streamed successfully: ${publicId}`);
        resolve();
      });
      
      downloadStream.on('error', (error) => {
        console.error(`❌ [IMAGE] Error streaming image ${publicId}:`, error);
        reject(error);
      });
    });
  } catch (error) {
    console.error(`Error retrieving image with ID ${publicId} from GridFS:`, error);
    throw new Error(`Failed to retrieve image: ${(error as Error).message}`);
  }
}

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
      // Stream the image data directly to response
      await getImage(imageId, vercelResponse);
      // Response is handled by the stream pipeline, no need to return JSON
    } catch (error: unknown) {
      console.error('❌ [IMAGE] Error retrieving image:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        imageId,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress
      });

      return vercelResponse.status(404).json({
        message: 'Image not found',
        error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
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
    } catch (error: unknown) {
      console.error('❌ [IMAGE] Error deleting image:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        imageId,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress
      });

      return vercelResponse.status(500).json({
        message: 'Error deleting image',
        error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      });
    }
  } else {
    // Method not allowed
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }
}