import mongoose from 'mongoose';

// Upload image to MongoDB GridFS
const uploadImageToGridFS = async (buffer: Buffer, filename: string, mimeType: string): Promise<{ fileId: mongoose.Types.ObjectId; url: string }> => {
  try {
    console.log('GridFS上传开始:', { filename, mimeType, bufferSize: buffer.length });
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    
    // Get the MongoDB connection from mongoose
    const db = mongoose.connection.db as mongoose.mongo.Db;
    console.log('数据库连接正常:', { dbName: db.databaseName });
    
    // Create GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: 'images'
    });
    console.log('GridFS bucket创建成功');
    
    // Determine content type
    let contentType = mimeType
    
    // If no MIME type provided, try to guess from filename
    if (!contentType || contentType === 'application/octet-stream') {
      if (/\.jpe?g$/i.test(filename)) {
        contentType = 'image/jpeg'
      } else if (/\.png$/i.test(filename)) {
        contentType = 'image/png'
      } else if (/\.gif$/i.test(filename)) {
        contentType = 'image/gif'
      } else if (/\.webp$/i.test(filename)) {
        contentType = 'image/webp'
      } else if (/\.bmp$/i.test(filename)) {
        contentType = 'image/bmp'
      } else if (/\.svg$/i.test(filename)) {
        contentType = 'image/svg+xml'
      } else {
        // Default to jpeg for unknown types
        contentType = 'image/jpeg'
      }
      console.log(`根据文件名推断MIME类型: ${filename} -> ${contentType}`)
    }
    
    // Create upload stream with proper metadata
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: contentType
    });
    console.log('上传流创建成功:', { streamId: uploadStream.id });
    
    // Write buffer to stream and end it
    uploadStream.end(buffer);
    
    // Wait for the upload to complete
    await new Promise<void>((resolve, reject) => {
      uploadStream.on('finish', () => {
        console.log('GridFS上传流完成事件触发');
        resolve();
      });
      uploadStream.on('error', (error) => {
        console.error('GridFS上传流错误:', error);
        reject(error);
      });
    });
    
    // Get the file ID from the uploadStream
    const fileId = uploadStream.id;
    console.log('GridFS上传完成:', { fileId: fileId?.toString(), filename });
    
    if (!fileId) {
      throw new Error('Failed to get file ID from upload stream');
    }
    
    // Return file info with URL for accessing the image
    return {
      fileId: fileId,
      url: `/api/images/${fileId}` // URL to access the image
    };
  } catch (error) {
    throw new Error('Image upload failed: ' + (error as Error).message);
  }
};

// Get image from MongoDB GridFS
const getImageFromGridFS = async (fileId: string) => {
  try {
    // Get the MongoDB connection from mongoose
    const db = mongoose.connection.db as mongoose.mongo.Db;
    
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
    
    // Check that files[0] exists before accessing its properties
    if (!files[0]) {
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
    const db = mongoose.connection.db as mongoose.mongo.Db;
    
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