import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import * as config from '../config';

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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password as string, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    if (user) {
      res.status(201).json({
        _id: (user as any)._id,
        name: user.name,
        email: user.email,
        token: generateToken((user as any)._id.toString()),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Login user
const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists and password is correct
    if (user && (await bcrypt.compare(password as string, user.password as string))) {
      res.json({
        _id: (user as any)._id,
        name: user.name,
        email: user.email,
        token: generateToken((user as any)._id.toString()),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Get user profile
const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // req.user is attached by auth middleware
    const user = await User.findById((req as any).user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export {
  registerUser,
  loginUser,
  getUserProfile,
};