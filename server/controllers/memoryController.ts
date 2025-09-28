import { Request, Response } from 'express';
import Memory from '../models/Memory';
import { uploadImage, deleteImage } from '../utils/imageUpload';

// @desc    Get all memories (shared for all users)
// @route   GET /api/memories
// @access  Private
const getMemories = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 [MEMORIES] Fetching all shared memories');
    const memories = await Memory.find({}).sort({ date: -1 }).populate('user', 'name email');
    console.log('✅ [MEMORIES] Successfully fetched', memories.length, 'shared memories');
    res.json(memories);
  } catch (error: unknown) {
    console.error('❌ [MEMORIES] Error fetching memories:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      userId: req.user?._id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({ 
      message: 'Error fetching memories',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
};

// @desc    Get single memory (accessible to all users)
// @route   GET /api/memories/:id
// @access  Private
const getMemory = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 [MEMORY] Fetching memory:', req.params.id);
    
    const memory = await Memory.findById(req.params.id).populate('user', 'name email');

    if (!memory) {
      console.log('❌ [MEMORY] Memory not found:', req.params.id);
      res.status(404).json({ 
        message: 'Memory not found',
        memoryId: req.params.id 
      });
      return;
    }

    console.log('✅ [MEMORY] Memory retrieved successfully:', memory._id);
    res.json(memory);
  } catch (error: unknown) {
    console.error('❌ [MEMORY] Error fetching single memory:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      userId: req.user?._id,
      memoryId: req.params.id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({ 
      message: 'Error fetching memory',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
      memoryId: req.params.id
    });
  }
};

// @desc    Create new memory
// @route   POST /api/memories
// @access  Private
const createMemory = async (req: Request, res: Response): Promise<void> => {
  const { title, description, date } = req.body;
  const images: { url: string; publicId: string }[] = [];

  try {
    console.log('📝 [MEMORY] Starting to create new memory:', {
      title,
      description,
      date,
      hasFiles: !!(req.files && (req.files as Express.Multer.File[]).length > 0),
      filesCount: req.files ? (req.files as Express.Multer.File[]).length : 0,
      userId: req.user?._id
    });

    // Validate required fields
    if (!title || !description || !date) {
      console.log('❌ [MEMORY] Missing required fields in create memory request:', {
        hasTitle: !!title,
        hasDescription: !!description,
        hasDate: !!date
      });
      res.status(400).json({ 
        message: 'Title, description, and date are required',
        missingFields: [
          !title && 'title',
          !description && 'description', 
          !date && 'date'
        ].filter(Boolean)
      });
      return;
    }

    // Upload images if provided
    if (req.files && (req.files as Express.Multer.File[]).length > 0) {
      console.log(`🖼️ [IMAGES] Uploading ${(req.files as Express.Multer.File[]).length} images...`);
      for (const file of req.files as Express.Multer.File[]) {
        console.log(`🖼️ [IMAGE] Processing file: ${file.originalname}, Size: ${file.size} bytes, Type: ${file.mimetype}`);
        try {
          const uploadedImage = await uploadImage(file.buffer, file.originalname, file.mimetype);
          console.log(`✅ [IMAGE] Image uploaded successfully:`, uploadedImage);
          images.push(uploadedImage);
        } catch (uploadError: unknown) {
          console.error('❌ [IMAGE] Error uploading image:', {
            error: uploadError.message,
            fileName: file.originalname,
            fileSize: file.size,
            fileType: file.mimetype,
            timestamp: new Date().toISOString(),
            userId: req.user?._id,
            path: req.path,
            method: req.method,
            ip: req.ip || req.connection.remoteAddress
          });
          
          // If an image fails to upload, we should return an error
          res.status(500).json({ 
            message: `Error uploading image: ${file.originalname}`,
            error: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
          });
          return;
        }
      }
    }

    console.log('💾 [MEMORY] Creating memory in database for user:', req.user?._id);
    const memory = await Memory.create({
      title,
      description,
      date,
      images,
      user: req.user!._id,
    });

    console.log('✅ [MEMORY] Memory created successfully:', { id: memory._id, imagesCount: images.length });
    res.status(201).json(memory);
  } catch (error: unknown) {
    console.error('❌ [MEMORY] Error creating memory:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      userId: req.user?._id,
      payload: {
        title: req.body.title,
        description: req.body.description ? 'provided' : 'missing',
        date: req.body.date,
        filesCount: req.files ? (req.files as Express.Multer.File[]).length : 0
      },
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({ 
      message: 'Error creating memory',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
};

// @desc    Update memory
// @route   PUT /api/memories/:id
// @access  Private
const updateMemory = async (req: Request, res: Response): Promise<void> => {
  const { title, description, date } = req.body;
  let images: { url: string; publicId: string }[] = [];
  let imagesToDelete: string[] = [];

  try {
    console.log('✏️ [MEMORY] Starting update for memory:', {
      id: req.params.id,
      title,
      description,
      date,
      hasFiles: !!(req.files && (req.files as Express.Multer.File[]).length > 0),
      filesCount: req.files ? (req.files as Express.Multer.File[]).length : 0,
      imagesToDeleteRaw: req.body.imagesToDelete,
      userId: req.user?._id
    });

    let memory = await Memory.findById(req.params.id);

    if (!memory) {
      console.log('❌ [MEMORY] Attempt to update non-existent memory:', req.params.id);
      res.status(404).json({ 
        message: 'Memory not found',
        memoryId: req.params.id
      });
      return;
    }

    // Check if user owns memory or is admin
    const isOwner = (memory as any).user.toString() === req.user!._id.toString();
    const isAdmin = req.user!.isAdmin;
    
    if (!isOwner && !isAdmin) {
      console.log('❌ [MEMORY] Unauthorized update attempt - user does not own memory and is not admin:', {
        userId: req.user?._id,
        memoryId: req.params.id,
        memoryOwner: (memory as any).user.toString(),
        isAdmin: req.user!.isAdmin
      });
      res.status(401).json({ 
        message: 'Not authorized - only the creator or admin can edit this memory',
        authorized: false,
        userId: req.user?._id,
        memoryId: req.params.id
      });
      return;
    }

    // Validate request data
    if (!title && !description && !date && !(req.files && (req.files as Express.Multer.File[]).length > 0) && !req.body.imagesToDelete) {
      console.log('❌ [MEMORY] No data provided to update memory:', req.params.id);
      res.status(400).json({ 
        message: 'No data provided for update',
        memoryId: req.params.id
      });
      return;
    }

    // Get images to delete if provided
    if (req.body.imagesToDelete) {
      try {
        imagesToDelete = JSON.parse(req.body.imagesToDelete);
        console.log('🗑️ [IMAGES] Marked for deletion:', imagesToDelete);
      } catch (parseError: unknown) {
          console.error('❌ [MEMORY] Error parsing imagesToDelete:', {
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
            imagesToDeleteRaw: req.body.imagesToDelete,
            timestamp: new Date().toISOString(),
            path: req.path,
            method: req.method,
            userId: req.user?._id,
            memoryId: req.params.id,
            ip: req.ip || req.connection.remoteAddress
          });
          
          res.status(400).json({ 
            message: 'Invalid imagesToDelete format',
            error: process.env.NODE_ENV === 'development' && parseError instanceof Error ? parseError.message : undefined
          });
          return;
        }
    }

    // Delete specified images from MongoDB GridFS
    for (const publicId of imagesToDelete) {
      console.log(`🗑️ [IMAGE] Deleting: ${publicId}`);
      try {
        await deleteImage(publicId);
        console.log(`✅ [IMAGE] Deleted successfully: ${publicId}`);
      } catch (deleteError: unknown) {
          console.error('❌ [IMAGE] Error deleting image:', {
            error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
            publicId,
            timestamp: new Date().toISOString(),
            path: req.path,
            method: req.method,
            userId: req.user?._id,
            memoryId: req.params.id,
            ip: req.ip || req.connection.remoteAddress
          });
          
          // Continue processing other images even if one fails
        }
    }

    // Filter out deleted images from existing images
    const existingImages = memory.images.filter(img => !imagesToDelete.includes(img.publicId));
    console.log(`🖼️ [IMAGES] Retaining ${existingImages.length} existing images`);

    // Upload new images if provided
    if (req.files && (req.files as Express.Multer.File[]).length > 0) {
      console.log(`🖼️ [IMAGES] Uploading ${(req.files as Express.Multer.File[]).length} new images...`);
      for (const file of req.files as Express.Multer.File[]) {
        console.log(`🖼️ [IMAGE] Processing file: ${file.originalname}, Size: ${file.size} bytes, Type: ${file.mimetype}`);
        try {
          const uploadedImage = await uploadImage(file.buffer, file.originalname, file.mimetype);
          console.log(`✅ [IMAGE] New image uploaded:`, uploadedImage);
          images.push(uploadedImage);
        } catch (uploadError: unknown) {
          console.error('❌ [IMAGE] Error uploading new image:', {
            error: uploadError instanceof Error ? uploadError.message : 'Unknown error',
            fileName: file.originalname,
            fileSize: file.size,
            fileType: file.mimetype,
            timestamp: new Date().toISOString(),
            userId: req.user?._id,
            memoryId: req.params.id,
            ip: req.ip || req.connection.remoteAddress
          });
          
          res.status(500).json({ 
            message: `Error uploading new image: ${file.originalname}`,
            error: process.env.NODE_ENV === 'development' && uploadError instanceof Error ? uploadError.message : undefined
          });
          return;
        }
      }
    }

    // Combine existing images (excluding deleted ones) with new images
    images = [...existingImages, ...images];
    console.log(`🖼️ [IMAGES] Total images after update: ${images.length}`);

    memory = await Memory.findByIdAndUpdate(
      req.params.id,
      { title, description, date, images },
      { new: true, runValidators: true }
    );

    if (!memory) {
      console.error('❌ [MEMORY] Failed to update memory (update returned null):', {
        id: req.params.id,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        userId: req.user?._id,
        ip: req.ip || req.connection.remoteAddress
      });
      res.status(500).json({ 
        message: 'Failed to update memory in database',
        memoryId: req.params.id
      });
      return;
    }

    console.log('✅ [MEMORY] Memory updated successfully:', { id: memory._id, imagesCount: images.length });
    res.json(memory);
  } catch (error: unknown) {
    console.error('❌ [MEMORY] Error updating memory:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      userId: req.user?._id,
      memoryId: req.params.id,
      payload: {
        title: req.body.title,
        description: req.body.description ? 'provided' : 'missing',
        date: req.body.date,
        filesCount: req.files ? (req.files as Express.Multer.File[]).length : 0,
        imagesToDelete: req.body.imagesToDelete
      },
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({ 
      message: 'Error updating memory',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
      memoryId: req.params.id
    });
  }
};

// @desc    Delete memory
// @route   DELETE /api/memories/:id
// @access  Private
const deleteMemory = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🗑️ [MEMORY] Starting deletion process for:', req.params.id);
    
    const memory = await Memory.findById(req.params.id);

    if (!memory) {
      console.log('❌ [MEMORY] Attempt to delete non-existent memory:', req.params.id);
      res.status(404).json({ 
        message: 'Memory not found',
        memoryId: req.params.id 
      });
      return;
    }

    // Check if user owns memory or is admin
    const isOwner = (memory as any).user.toString() === req.user!._id.toString();
    const isAdmin = req.user!.isAdmin;
    
    if (!isOwner && !isAdmin) {
      console.log('❌ [MEMORY] Unauthorized deletion attempt - user does not own memory and is not admin:', {
        userId: req.user?._id,
        memoryId: req.params.id,
        memoryOwner: (memory as any).user.toString(),
        isAdmin: req.user!.isAdmin
      });
      res.status(401).json({ 
        message: 'Not authorized - only the creator or admin can delete this memory',
        authorized: false,
        userId: req.user?._id,
        memoryId: req.params.id
      });
      return;
    }

    // Delete images from MongoDB GridFS
    console.log(`🗑️ [IMAGES] Deleting ${memory.images.length} images from GridFS...`);
    for (const image of memory.images) {
      console.log(`🗑️ [IMAGE] Deleting image: ${image.publicId}`);
      try {
        await deleteImage(image.publicId);
        console.log(`✅ [IMAGE] GridFS image deleted: ${image.publicId}`);
      } catch (deleteError: unknown) {
          console.error('❌ [IMAGE] Error deleting image from GridFS:', {
            error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
            publicId: image.publicId,
            timestamp: new Date().toISOString(),
            path: req.path,
            method: req.method,
            userId: req.user?._id,
            memoryId: req.params.id,
            ip: req.ip || req.connection.remoteAddress
          });
          
          // Continue even if image deletion fails
        }
    }

    // Delete the memory document
    await memory.deleteOne();
    console.log('✅ [MEMORY] Memory deleted successfully:', req.params.id);
    res.json({ 
      message: 'Memory removed',
      memoryId: req.params.id
    });
  } catch (error: unknown) {
    console.error('❌ [MEMORY] Error deleting memory:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      userId: req.user?._id,
      memoryId: req.params.id,
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({ 
      message: 'Error deleting memory',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
      memoryId: req.params.id
    });
  }
};

export {
  getMemories,
  getMemory,
  createMemory,
  updateMemory,
  deleteMemory,
};