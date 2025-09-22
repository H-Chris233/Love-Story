import mongoose from 'mongoose';

// Upload image to MongoDB GridFS
const uploadImageToGridFS = async (buffer: Buffer, filename: string, mimeType: string): Promise<{ fileId: mongoose.Types.ObjectId; url: string }> => {
  try {
    // Get the MongoDB connection from mongoose
    const db = mongoose.connection.db;
    
    // Create GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: 'images'
    });
    
    // Create upload stream with proper metadata
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimeType || 'image/jpeg'  // Default to jpeg if not provided
    });
    
    // Write buffer to stream and end it
    uploadStream.end(buffer);
    
    // Wait for the upload to complete
    const fileInfo = await new Promise<any>((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });
    
    // Return file info with URL for accessing the image
    return {
      fileId: fileInfo._id,
      url: `/api/images/${fileInfo._id}` // URL to access the image
    };
  } catch (error) {
    throw new Error('Image upload failed: ' + (error as Error).message);
  }
};

// Get image from MongoDB GridFS
const getImageFromGridFS = async (fileId: string) => {
  try {
    // Get the MongoDB connection from mongoose
    const db = mongoose.connection.db;
    
    // Create GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: 'images'
    });
    
    // Convert string to ObjectId
    const objectId = new mongoose.Types.ObjectId(fileId);
    
    // Check if file exists and get its metadata
    const files = await bucket.find({ _id: objectId }).toArray();
    if (files.length === 0) {
      throw new Error('File not found');
    }
    
    // Create download stream
    const downloadStream = bucket.openDownloadStream(objectId);
    
    // Use the contentType from the file metadata, or default to jpeg
    const contentType = files[0].contentType || 'image/jpeg';
    
    return {
      stream: downloadStream,
      contentType: contentType
    };
  } catch (error) {
    throw new Error('Failed to retrieve image: ' + (error as Error).message);
  }
};

// Delete image from MongoDB GridFS
const deleteImageFromGridFS = async (fileId: string): Promise<void> => {
  try {
    // Get the MongoDB connection from mongoose
    const db = mongoose.connection.db;
    
    // Create GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: 'images'
    });
    
    // Convert string to ObjectId
    const objectId = new mongoose.Types.ObjectId(fileId);
    
    // Delete the file
    await bucket.delete(objectId);
  } catch (error) {
    throw new Error('Failed to delete image: ' + (error as Error).message);
  }
};

export { uploadImageToGridFS, getImageFromGridFS, deleteImageFromGridFS };