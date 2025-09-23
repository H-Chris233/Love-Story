import express from 'express';
import {
  getMemories,
  getMemory,
  createMemory,
  updateMemory,
  deleteMemory,
} from '../controllers/memoryController';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../utils/imageUpload';

const router = express.Router();

// All routes are protected
router.route('/')
  .get(protect, getMemories)
  .post(protect, upload.array('images'), createMemory);

router.route('/:id')
  .get(protect, getMemory)
  .put(protect, upload.array('images'), updateMemory)
  .delete(protect, deleteMemory);

export default router;