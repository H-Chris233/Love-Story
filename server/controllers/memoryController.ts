import { Request, Response } from 'express';
import Memory, { IMemory } from '../models/Memory';
import User from '../models/User';
import { uploadImage, deleteImage } from '../utils/imageUpload';

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
    if ((memory as any).user.toString() !== (req as any).user._id.toString()) {
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
  const images: { url: string; publicId: string }[] = [];

  try {
    console.log('创建记忆请求:', {
      title,
      description,
      date,
      hasFiles: !!(req.files && (req.files as Express.Multer.File[]).length > 0),
      filesCount: req.files ? (req.files as Express.Multer.File[]).length : 0,
      userId: (req as any).user._id
    });

    // Upload images if provided
    if (req.files && (req.files as Express.Multer.File[]).length > 0) {
      console.log(`正在上传 ${(req.files as Express.Multer.File[]).length} 张图片...`);
      for (const file of req.files as Express.Multer.File[]) {
        console.log(`上传图片: ${file.originalname}, 大小: ${file.size} bytes, 类型: ${file.mimetype}`);
        const uploadedImage = await uploadImage(file.buffer, file.originalname, file.mimetype);
        console.log(`图片上传成功:`, uploadedImage);
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

    console.log('记忆创建成功:', { id: memory._id, imagesCount: images.length });
    res.status(201).json(memory);
  } catch (error: any) {
    console.error('创建记忆失败:', error);
    res.status(500).json({ message: error.message });
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
    console.log('更新记忆请求:', {
      id: req.params.id,
      title,
      description,
      date,
      hasFiles: !!(req.files && (req.files as Express.Multer.File[]).length > 0),
      filesCount: req.files ? (req.files as Express.Multer.File[]).length : 0,
      imagesToDeleteRaw: req.body.imagesToDelete,
      userId: (req as any).user._id
    });

    let memory = await Memory.findById(req.params.id);

    if (!memory) {
      res.status(404).json({ message: 'Memory not found' });
      return;
    }

    // Check if user owns memory
    if ((memory as any).user.toString() !== (req as any).user._id.toString()) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Get images to delete if provided
    if (req.body.imagesToDelete) {
      try {
        imagesToDelete = JSON.parse(req.body.imagesToDelete);
        console.log('解析要删除的图片:', imagesToDelete);
      } catch (e) {
        console.error('Error parsing imagesToDelete:', e);
      }
    }

    // Delete specified images from MongoDB GridFS
    for (const publicId of imagesToDelete) {
      console.log(`删除图片: ${publicId}`);
      await deleteImage(publicId);
    }

    // Filter out deleted images from existing images
    const existingImages = memory.images.filter(img => !imagesToDelete.includes(img.publicId));
    console.log(`保留现有图片: ${existingImages.length} 张`);

    // Upload new images if provided
    if (req.files && (req.files as Express.Multer.File[]).length > 0) {
      console.log(`正在上传 ${(req.files as Express.Multer.File[]).length} 张新图片...`);
      for (const file of req.files as Express.Multer.File[]) {
        console.log(`上传图片: ${file.originalname}, 大小: ${file.size} bytes, 类型: ${file.mimetype}`);
        const uploadedImage = await uploadImage(file.buffer, file.originalname, file.mimetype);
        console.log(`图片上传成功:`, uploadedImage);
        images.push(uploadedImage);
      }
    }

    // Combine existing images (excluding deleted ones) with new images
    images = [...existingImages, ...images];
    console.log(`最终图片数量: ${images.length} 张`);

    memory = await Memory.findByIdAndUpdate(
      req.params.id,
      { title, description, date, images },
      { new: true, runValidators: true }
    );

    console.log('记忆更新成功:', { id: memory?._id, imagesCount: images.length });
    res.json(memory);
  } catch (error: any) {
    console.error('更新记忆失败:', error);
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
    if ((memory as any).user.toString() !== (req as any).user._id.toString()) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Delete images from MongoDB GridFS
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