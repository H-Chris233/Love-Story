import multer from 'multer';
import { uploadImageToGridFS, deleteImageFromGridFS } from './imageStorage';
import mongoose from 'mongoose';
import sharp from 'sharp';

console.log('🖼️ [IMAGE_UPLOAD] 初始化图片上传模块，支持宽松的文件格式验证和图片压缩');

// Create multer instance with memory storage and limits
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    console.log(`Multer文件过滤器检查: ${file.originalname}, MIME类型: "${file.mimetype}"`);
    
    // 采用更宽松的策略，让大多数文件通过
    // 真正的验证将在GridFS上传时进行
    
    // 1. 如果有正确的图片MIME类型，直接通过
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      console.log(`✅ 文件 ${file.originalname} 通过MIME类型验证: ${file.mimetype}`);
      cb(null, true);
      return;
    }
    
    // 2. 如果有图片扩展名，通过
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.originalname);
    if (hasImageExtension) {
      console.log(`✅ 文件 ${file.originalname} 通过扩展名验证（MIME: "${file.mimetype}"）`);
      cb(null, true);
      return;
    }
    
    // 3. 如果没有扩展名但有内容，也允许通过（让GridFS处理）
    const hasNoExtension = !file.originalname.includes('.');
    if (hasNoExtension) {
      console.log(`✅ 文件 ${file.originalname} 没有扩展名，允许通过让GridFS验证（MIME: "${file.mimetype}"）`);
      cb(null, true);
      return;
    }
    
    // 4. 其他情况也暂时允许通过，在GridFS层面进行最终验证
    console.log(`⚠️ 文件 ${file.originalname} 格式未知，但允许通过 - MIME: "${file.mimetype}"`);
    cb(null, true);
  }
});

// Simple file type detection by checking file headers
const detectImageType = (buffer: Buffer): string | null => {
  if (buffer.length < 4) return null;
  
  // Check common image file signatures
  const header = buffer.subarray(0, 12);
  
  // JPEG
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
    return 'image/jpeg';
  }
  
  // PNG
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
    return 'image/png';
  }
  
  // GIF
  if (header.subarray(0, 6).toString('ascii') === 'GIF87a' || header.subarray(0, 6).toString('ascii') === 'GIF89a') {
    return 'image/gif';
  }
  
  // WebP
  if (header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  
  // BMP
  if (header[0] === 0x42 && header[1] === 0x4D) {
    return 'image/bmp';
  }
  
  return null;
};

// 优化图片质量
const optimizeImage = async (buffer: Buffer, mimeType: string): Promise<Buffer> => {
  try {
    // 仅对支持的格式进行优化
    if (!mimeType.startsWith('image/')) {
      return buffer; // 非图片格式直接返回
    }
    
    // JPEG、PNG、WebP格式进行优化
    let sharpInstance = sharp(buffer);
    
    // 如果是JPEG或PNG，调整为最大1920x1080分辨率，质量80%
    if (mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/webp') {
      sharpInstance = sharpInstance
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80, progressive: true })
        .png({ quality: 80 })
        .webp({ quality: 80 });
    }
    
    return await sharpInstance.toBuffer();
  } catch (error) {
    console.error('图片优化失败:', error);
    // 如果优化失败，返回原始buffer
    return buffer;
  }
};

// Upload image to MongoDB GridFS
const uploadImage = async (fileBuffer: Buffer, filename: string, mimeType: string): Promise<{ url: string; publicId: string }> => {
  try {
    console.log('开始上传图片到GridFS:', { filename, mimeType, size: fileBuffer.length });
    
    // 检测文件类型
    const detectedType = detectImageType(fileBuffer);
    console.log('文件类型检测结果:', { provided: mimeType, detected: detectedType });
    
    if (!detectedType && !mimeType?.startsWith('image/')) {
      throw new Error(`文件 "${filename}" 不是有效的图片格式`);
    }
    
    // 使用检测到的类型或提供的类型
    const finalMimeType = detectedType || mimeType || 'image/jpeg';
    console.log(`使用MIME类型: ${finalMimeType}`);
    
    // 优化图片质量以减少存储空间和传输时间
    const optimizedBuffer = await optimizeImage(fileBuffer, finalMimeType);
    
    const result = await uploadImageToGridFS(optimizedBuffer, filename, finalMimeType);
    console.log('GridFS上传结果:', result);
    
    return {
      url: result.url,
      publicId: result.fileId.toString(), // Use MongoDB ObjectId as publicId
    };
  } catch (error) {
    console.error('图片上传失败:', error);
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