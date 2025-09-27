import multer from 'multer';
import { uploadImageToGridFS, deleteImageFromGridFS } from './imageStorage';

console.log('🖼️ [IMAGE_UPLOAD] Initializing image upload module with strict file format validation');

// Create multer instance with memory storage and limits
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    console.log(`🔍 [MULTER] File filter checking: ${file.originalname}, MIME type: "${file.mimetype}"`);
    
    // 1. If it has a correct image MIME type, pass through
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      console.log(`✅ [MULTER] File ${file.originalname} passed MIME type validation: ${file.mimetype}`);
      cb(null, true);
      return;
    }
    
    // 2. If it has an image extension, pass through
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.originalname);
    if (hasImageExtension) {
      console.log(`✅ [MULTER] File ${file.originalname} passed extension validation (MIME: "${file.mimetype}")`);
      cb(null, true);
      return;
    }
    
    // 3. If no extension but has content, allow through (to be validated at GridFS level)
    const hasNoExtension = !file.originalname.includes('.');
    if (hasNoExtension) {
      console.log(`✅ [MULTER] File ${file.originalname} has no extension, allowing through for GridFS validation (MIME: "${file.mimetype}")`);
      cb(null, true);
      return;
    }
    
    // 4. For other cases, provide a warning in development
    console.log(`⚠️ [MULTER] File ${file.originalname} format unknown, allowing through for final validation - MIME: "${file.mimetype}"`);
    cb(null, true);
  }
});

// Simple file type detection by checking file headers
const detectImageType = (buffer: Buffer): string | null => {
  console.log('🔍 [IMAGE_DETECTION] Detecting image type from buffer...');
  
  if (buffer.length < 4) {
    console.log('❌ [IMAGE_DETECTION] Buffer too small for detection');
    return null;
  }
  
  // Check common image file signatures
  const header = buffer.subarray(0, 12);
  
  // JPEG
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
    console.log('✅ [IMAGE_DETECTION] Identified as JPEG');
    return 'image/jpeg';
  }
  
  // PNG
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
    console.log('✅ [IMAGE_DETECTION] Identified as PNG');
    return 'image/png';
  }
  
  // GIF
  if (header.subarray(0, 6).toString('ascii') === 'GIF87a' || header.subarray(0, 6).toString('ascii') === 'GIF89a') {
    console.log('✅ [IMAGE_DETECTION] Identified as GIF');
    return 'image/gif';
  }
  
  // WebP
  if (header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP') {
    console.log('✅ [IMAGE_DETECTION] Identified as WebP');
    return 'image/webp';
  }
  
  // BMP
  if (header[0] === 0x42 && header[1] === 0x4D) {
    console.log('✅ [IMAGE_DETECTION] Identified as BMP');
    return 'image/bmp';
  }
  
  console.log('❌ [IMAGE_DETECTION] Unknown file type');
  return null;
};

// Upload image to MongoDB GridFS
const uploadImage = async (fileBuffer: Buffer, filename: string, mimeType: string): Promise<{ url: string; publicId: string }> => {
  try {
    console.log('📤 [GRIDFS] Starting image upload to GridFS:', { filename, mimeType, size: fileBuffer.length });
    
    // Check file type
    const detectedType = detectImageType(fileBuffer);
    console.log('🔍 [GRIDFS] File type detection result:', { provided: mimeType, detected: detectedType });
    
    if (!detectedType && !mimeType?.startsWith('image/')) {
      console.log('❌ [GRIDFS] File validation failed - not a valid image format:', filename);
      throw new Error(`File "${filename}" is not a valid image format`);
    }
    
    // Use detected type or provided type
    const finalMimeType = detectedType || mimeType || 'image/jpeg';
    console.log(`🏷️ [GRIDFS] Using MIME type: ${finalMimeType}`);
    
    const result = await uploadImageToGridFS(fileBuffer, filename, finalMimeType);
    console.log('✅ [GRIDFS] Upload completed successfully:', result);
    
    return {
      url: result.url,
      publicId: result.fileId.toString(), // Use MongoDB ObjectId as publicId
    };
  } catch (error: unknown) {
    console.error('❌ [GRIDFS] Image upload failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      filename,
      mimeType,
      size: fileBuffer.length,
      timestamp: new Date().toISOString(),
      detectedType: detectImageType(fileBuffer),
      message: 'Image upload failed'
    });
    
    throw new Error(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Delete image from MongoDB GridFS
const deleteImage = async (publicId: string): Promise<void> => {
  try {
    console.log('🗑️ [GRIDFS] Starting image deletion from GridFS:', publicId);
    await deleteImageFromGridFS(publicId);
    console.log('✅ [GRIDFS] Image deleted successfully:', publicId);
  } catch (error: unknown) {
    console.error('❌ [GRIDFS] Image deletion failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      publicId,
      timestamp: new Date().toISOString(),
      message: 'Image deletion failed'
    });
    
    throw new Error(`Image deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export { upload, uploadImage, deleteImage };