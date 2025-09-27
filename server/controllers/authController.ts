import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import User from '../models/User';
import * as config from '../config';
import mongoose from 'mongoose';

interface JwtPayload {
  id: string;
}

// Generate JWT token
const generateToken = (id: string): string => {
  return jwt.sign({ id }, config.default.jwtSecret, {
    expiresIn: '30d',
  });
};

// Register user
const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  try {
    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Check if this is the first user (should be admin)
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password as string, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isAdmin: isFirstUser, // First user gets admin privileges
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken((user._id as mongoose.Types.ObjectId).toString()),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: unknown) {
    console.error('❌ [AUTH] Registration failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      requestBody: { name, email, password: '***' },
      timestamp: new Date().toISOString()
    });
    
    // Handle Mongoose validation errors
    if (error instanceof Error && error.name === 'ValidationError' && 'errors' in error) {
      const mongooseError = error as mongoose.Error.ValidationError;
      const validationErrors = Object.values(mongooseError.errors).map(err => err.message);
      res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors,
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }
};

// Login user
const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    // Find user by email and include password field
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists and password is correct
    if (user && (await bcrypt.compare(password as string, user.password as string))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken((user._id as mongoose.Types.ObjectId).toString()),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: unknown) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
};

// Get user profile
const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // req.user is attached by auth middleware
    const user = await User.findById(req.user!._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: unknown) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
};

// Check if registration is allowed (no users exist)
const checkRegistrationAllowed = async (req: Request, res: Response): Promise<void> => {
  try {
    const userCount = await User.countDocuments();
    res.json({
      registrationAllowed: userCount === 0,
      message: userCount === 0 ? 'Registration allowed for first admin user' : 'Registration not allowed'
    });
  } catch (error: unknown) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
};

// Get all users (Admin only)
const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('👥 [USERS] Admin fetching all users:', req.user?._id);

    // Check if current user is admin
    if (!req.user?.isAdmin) {
      console.log('❌ [USERS] Unauthorized access attempt - user is not admin:', req.user?._id);
      res.status(403).json({ message: 'Access denied - admin privileges required' });
      return;
    }

    // Get all users (excluding passwords)
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    
    console.log('✅ [USERS] Successfully fetched users:', {
      count: users.length,
      adminId: req.user._id,
      timestamp: new Date().toISOString()
    });

    res.json(users);
    
  } catch (error: unknown) {
    console.error('❌ [USERS] Error fetching users:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      adminId: req.user?._id,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
};

// Delete user (Admin only)
const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ [USER] Admin attempting to delete user:', {
      adminId: req.user?._id,
      targetUserId: id,
      timestamp: new Date().toISOString()
    });

    // Check if current user is admin
    if (!req.user?.isAdmin) {
      console.log('❌ [USER] Unauthorized delete attempt - user is not admin:', req.user?._id);
      res.status(403).json({ message: 'Access denied - admin privileges required' });
      return;
    }

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === id) {
      console.log('❌ [USER] Admin attempting to delete themselves:', req.user._id);
      res.status(400).json({ message: 'Cannot delete your own account' });
      return;
    }

    // Find and delete user
    const user = await User.findById(id);
    
    if (!user) {
      console.log('❌ [USER] User not found for deletion:', id);
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await User.findByIdAndDelete(id);
    
    console.log('✅ [USER] User deleted successfully:', {
      deletedUserId: id,
      deletedUserEmail: user.email,
      adminId: req.user._id,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
    
  } catch (error: unknown) {
    console.error('❌ [USER] Error deleting user:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      targetUserId: req.params.id,
      adminId: req.user?._id,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
};

export {
  registerUser,
  loginUser,
  getUserProfile,
  checkRegistrationAllowed,
  getAllUsers,
  deleteUser,
};