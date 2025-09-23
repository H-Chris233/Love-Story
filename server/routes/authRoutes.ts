import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  checkRegistrationAllowed,
} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/check-registration', checkRegistrationAllowed);

// Private routes
router.get('/profile', protect, getUserProfile);

export default router;