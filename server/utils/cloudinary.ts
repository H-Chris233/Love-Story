import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import config from '../config';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

// Create multer instance with Cloudinary storage
const upload = multer({ storage: cloudinary.uploader as any });

// Upload image to Cloudinary
const uploadImage = async (fileBuffer: Buffer): Promise<{ url: string; publicId: string }> => {
  try {
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'love-story',
          use_filename: true,
          unique_filename: false,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(fileBuffer);
    });
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    throw new Error('Image upload failed');
  }
};

// Delete image from Cloudinary
const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new Error('Image deletion failed');
  }
};

export { upload, uploadImage, deleteImage };