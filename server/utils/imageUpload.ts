import multer from 'multer';
import { uploadImageToGridFS, deleteImageFromGridFS } from './imageStorage';
import mongoose from 'mongoose';

// Create multer instance with memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Upload image to MongoDB GridFS
const uploadImage = async (fileBuffer: Buffer, filename: string, mimeType: string): Promise<{ url: string; publicId: string }> => {
  try {
    const result = await uploadImageToGridFS(fileBuffer, filename, mimeType);
    
    return {
      url: result.url,
      publicId: result.fileId.toString(), // Use MongoDB ObjectId as publicId
    };
  } catch (error) {
    throw new Error('Image upload failed: ' + (error as Error).message);
  }
};

// Delete image from MongoDB GridFS
const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await deleteImageFromGridFS(publicId);
  } catch (error) {
    throw new Error('Image deletion failed: ' + (error as Error).message);
  }
};

export { upload, uploadImage, deleteImage };