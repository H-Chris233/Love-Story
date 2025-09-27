import express from 'express';
import { getImageFromGridFS } from '../utils/imageStorage';

const router = express.Router();

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
    
    // Pipe the stream to response
    stream.pipe(res);
  } catch (error: unknown) {
    console.error('Error retrieving image:', error);
    res.status(404).json({ message: 'Image not found' });
  }
});

export default router;