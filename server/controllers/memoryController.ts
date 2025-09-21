import { Request, Response } from 'express';
import Memory, { IMemory } from '../models/Memory';
import User from '../models/User';
import { uploadImage, deleteImage } from '../utils/cloudinary';

// @desc    Get all memories for a user
// @route   GET /api/memories
// @access  Private
const getMemories = async (req: Request, res: Response): Promise<void> => {
  try {
    const memories = await Memory.find({ user: (req as any).user._id }).sort({ date: -1 });
    res.json(memories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single memory
// @route   GET /api/memories/:id
// @access  Private
const getMemory = async (req: Request, res: Response): Promise<void> => {
  try {
    const memory = await Memory.findById(req.params.id);

    if (!memory) {
      res.status(404).json({ message: 'Memory not found' });
      return;
    }

    // Check if user owns memory
    if (memory.user.toString() !== (req as any).user._id.toString()) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    res.json(memory);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new memory
// @route   POST /api/memories
// @access  Private
const createMemory = async (req: Request, res: Response): Promise<void> => {
  const { title, description, date } = req.body;
  let images: { url: string; publicId: string }[] = [];

  try {
    // Upload images if provided
    if (req.files && (req.files as Express.Multer.File[]).length > 0) {
      for (const file of req.files as Express.Multer.File[]) {
        const uploadedImage = await uploadImage(file.buffer);
        images.push(uploadedImage);
      }
    }

    const memory = await Memory.create({
      title,
      description,
      date,
      images,
      user: (req as any).user._id,
    });

    res.status(201).json(memory);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update memory
// @route   PUT /api/memories/:id
// @access  Private
const updateMemory = async (req: Request, res: Response): Promise<void> => {
  const { title, description, date } = req.body;
  let images: { url: string; publicId: string }[] = [];

  try {
    let memory = await Memory.findById(req.params.id);

    if (!memory) {
      res.status(404).json({ message: 'Memory not found' });
      return;
    }

    // Check if user owns memory
    if (memory.user.toString() !== (req as any).user._id.toString()) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Upload new images if provided
    if (req.files && (req.files as Express.Multer.File[]).length > 0) {
      for (const file of req.files as Express.Multer.File[]) {
        const uploadedImage = await uploadImage(file.buffer);
        images.push(uploadedImage);
      }
    }

    // Delete old images from Cloudinary if new images are uploaded
    if (images.length > 0) {
      for (const image of memory.images) {
        await deleteImage(image.publicId);
      }
    } else {
      // Keep existing images if no new images are uploaded
      images = memory.images;
    }

    memory = await Memory.findByIdAndUpdate(
      req.params.id,
      { title, description, date, images },
      { new: true, runValidators: true }
    );

    res.json(memory);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete memory
// @route   DELETE /api/memories/:id
// @access  Private
const deleteMemory = async (req: Request, res: Response): Promise<void> => {
  try {
    const memory = await Memory.findById(req.params.id);

    if (!memory) {
      res.status(404).json({ message: 'Memory not found' });
      return;
    }

    // Check if user owns memory
    if (memory.user.toString() !== (req as any).user._id.toString()) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Delete images from Cloudinary
    for (const image of memory.images) {
      await deleteImage(image.publicId);
    }

    await memory.deleteOne();

    res.json({ message: 'Memory removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export {
  getMemories,
  getMemory,
  createMemory,
  updateMemory,
  deleteMemory,
};