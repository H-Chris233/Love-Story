// api/auth/register.ts
// Vercel Serverless Function for user registration
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db';
import { hash } from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Db, ObjectId } from 'mongodb';

// Define JWT payload type
interface JwtPayload {
  userId: ObjectId;
  iat: number;
  exp: number;
}

// Define User type
interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string; // This will be hashed
  isAdmin: boolean;
  createdAt: Date;
}

// Generate JWT token
const generateToken = (userId: ObjectId): string => {
  return jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET || 'fallback_jwt_secret_for_development',
    { expiresIn: '30d' } // Token expires in 30 days
  );
};

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  if (request.method !== 'POST') {
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Extract user data from request body
    const { name, email, password } = request.body;

    // Validate required fields
    if (!name || !email || !password) {
      return vercelResponse.status(400).json({
        message: 'Please provide name, email, and password'
      });
    }

    // Validate email format (simple validation)
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return vercelResponse.status(400).json({
        message: 'Please provide a valid email'
      });
    }

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return vercelResponse.status(400).json({
        message: 'User with this email already exists'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return vercelResponse.status(400).json({
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if this is the first user (should be admin)
    const userCount = await usersCollection.countDocuments();
    const isFirstUser = userCount === 0;

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await hash(password, saltRounds);

    // Create new user object
    const newUser: User = {
      name,
      email: email.toLowerCase(), // Store emails in lowercase for consistency
      password: hashedPassword,
      isAdmin: isFirstUser, // First user gets admin privileges
      createdAt: new Date()
    };

    // Insert new user into database
    const result = await usersCollection.insertOne(newUser);
    
    // Generate JWT token
    const token = generateToken(result.insertedId);

    // Return success response with token and user info (excluding password)
    return vercelResponse.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertedId,
        name: newUser.name,
        email: newUser.email,
        isAdmin: newUser.isAdmin
      }
    });
  } catch (error: any) {
    console.error('❌ [AUTH] Registration failed:', {
      error: error.message,
      stack: error.stack,
      requestBody: { name: request.body.name, email: request.body.email, password: '***' },
      timestamp: new Date().toISOString()
    });
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return vercelResponse.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors,
        details: error.message 
      });
    } else if (error.code === 11000) {
      return vercelResponse.status(400).json({
        message: 'A user with this email already exists'
      });
    } else {
      // Generic error response
      return vercelResponse.status(500).json({
        message: error.message || 'Internal server error during registration'
      });
    }
  }
}