// api/utils/imageUpload.ts
// Image upload utilities for serverless functions

import { GridFSBucket, ObjectId } from 'mongodb';
import { connectToDatabase } from '../../lib/db';

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
export async function uploadImage(
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

/**
 * Delete an image from GridFS
 * @param publicId - The public ID of the image to delete
 */
export async function deleteImage(publicId: string): Promise<void> {
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
 * Get an image from GridFS
 * @param publicId - The public ID of the image to retrieve
 */
export async function getImage(publicId: string) {
  try {
    const { db } = await connectToDatabase();
    
    // Create a GridFS bucket
    const bucket = new GridFSBucket(db, { bucketName: 'images' });
    
    // Convert the publicId string back to ObjectId
    const fileId = new ObjectId(publicId);
    
    // Find the file in GridFS
    const file = await bucket.find({ _id: fileId }).limit(1).toArray();
    
    if (file.length === 0) {
      throw new Error('File not found');
    }
    
    return file[0];
  } catch (error) {
    console.error(`Error retrieving image with ID ${publicId} from GridFS:`, error);
    throw new Error(`Failed to retrieve image: ${(error as Error).message}`);
  }
}