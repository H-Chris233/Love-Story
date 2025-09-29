import express from 'express';
import { getImageFromGridFS, deleteImageFromGridFS } from '../utils/imageStorage';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../utils/imageUpload';
import Memory from '../models/Memory';

const router = express.Router();

// @desc    Get all images for authenticated user
// @route   GET /api/images
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    console.log('🖼️ [IMAGES] Fetching all images for user:', req.user?.id);
    
    // Find all memories that have images and belong to the authenticated user
    const memoriesWithImages = await Memory.find({ 
      user: req.user?.id,
      images: { $exists: true, $ne: [] }
    }).populate('user', 'name email');

    // Extract all images from memories
    const allImages: Array<{
      id: string;
      url: string;
      memoryId: string;
      memoryTitle: string;
      uploadDate: string;
    }> = [];
    
    for (const memory of memoriesWithImages) {
      for (const image of memory.images) {
        allImages.push({
          id: image.publicId,
          url: image.url,
          memoryId: memory._id.toString(),
          memoryTitle: memory.title,
          uploadDate: memory.createdAt.toISOString()
        });
      }
    }

    console.log(`✅ [IMAGES] Successfully fetched ${allImages.length} images`);

    res.status(200).json(allImages);
  } catch (error: unknown) {
    console.error('❌ [IMAGES] Error fetching images:', error);
    res.status(500).json({ 
      message: 'Error fetching images',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
});

// @desc    Upload new image to memory
// @route   POST /api/images
// @access  Private
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    console.log('🖼️ [IMAGES] Starting image upload for user:', req.user?.id);
    
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const { memoryId } = req.body;
    
    if (!memoryId) {
      return res.status(400).json({ message: 'memoryId is required' });
    }

    // Verify that the memory exists and belongs to the user
    const memory = await Memory.findOne({ 
      _id: memoryId,
      user: req.user?.id
    });

    if (!memory) {
      return res.status(404).json({ message: 'Memory not found or access denied' });
    }

    // Upload image using the existing upload utility
    const { uploadImage } = await import('../utils/imageUpload');
    const uploadResult = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);

    // Add the image to the memory's images array
    memory.images.push({
      url: uploadResult.url,
      publicId: uploadResult.publicId
    });
    memory.updatedAt = new Date();
    await memory.save();

    console.log('✅ [IMAGES] Image uploaded successfully:', {
      imageId: uploadResult.publicId,
      memoryId,
      filename: req.file.originalname
    });

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageId: uploadResult.publicId,
      filename: req.file.originalname,
      imageUrl: uploadResult.url
    });
  } catch (error: unknown) {
    console.error('❌ [IMAGES] Error uploading image:', error);
    res.status(500).json({ 
      message: 'Error uploading image',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
});

// @desc    Get image by ID
// @route   GET /api/images/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { stream, contentType } = await getImageFromGridFS(req.params.id);
    
    // Set content type, with fallback to image/jpeg if not set or generic
    const finalContentType = contentType && contentType !== 'application/octet-stream' 
      ? contentType 
      : 'image/jpeg';
    
    res.set('Content-Type', finalContentType);
    
    // Set cache headers for better performance
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Pipe the stream to response
    stream.pipe(res);
  } catch (error: unknown) {
    console.error('Error retrieving image:', error);
    res.status(404).json({ message: 'Image not found' });
  }
});

// @desc    Delete image by ID
// @route   DELETE /api/images/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    console.log('🗑️ [IMAGES] Deleting image:', req.params.id);
    
    const imageId = req.params.id;
    
    // Find the memory that contains this image and verify ownership
    const memory = await Memory.findOne({ 
      'images.publicId': imageId,
      user: req.user?.id
    });

    if (!memory) {
      return res.status(404).json({ message: 'Image not found or access denied' });
    }

    // Remove the image from the memory's images array
    memory.images = memory.images.filter(img => img.publicId !== imageId);
    memory.updatedAt = new Date();
    await memory.save();

    // Delete the image from GridFS
    await deleteImageFromGridFS(imageId);

    console.log('✅ [IMAGES] Image deleted successfully:', imageId);

    res.status(200).json({
      message: 'Image deleted successfully',
      imageId
    });
  } catch (error: unknown) {
    console.error('❌ [IMAGES] Error deleting image:', error);
    res.status(500).json({ 
      message: 'Error deleting image',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
});

export default router;