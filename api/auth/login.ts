// api/auth/login.ts
// Vercel Serverless Function for user login
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db';
import { compare } from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Db, ObjectId } from 'mongodb';

// Define User type
interface User {
  _id: ObjectId;
  name: string;
  email: string;
  password: string; // This will be hashed
  isAdmin: boolean;
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Extract email and password from request body
    const { email, password } = request.body;

    // Validate required fields
    if (!email || !password) {
      return vercelResponse.status(400).json({
        message: 'Please provide email and password'
      });
    }

    // Find user by email (case insensitive)
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    
    // If user not found or password doesn't match
    if (!user || !(await compare(password, user.password))) {
      return vercelResponse.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_jwt_secret_for_development',
      { expiresIn: '7d' } // Token expires in 7 days
    );

    // Return success response with token and user info (excluding password)
    return vercelResponse.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error: any) {
    console.error('Error in login handler:', error);
    
    return vercelResponse.status(500).json({
      message: 'Internal server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}