// api/auth/register.ts
// Vercel Serverless Function for user registration
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db';
import { hash } from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Db, ObjectId } from 'mongodb';

// Define User type
interface User {
  _id?: ObjectId;
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

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await hash(password, saltRounds);

    // Create new user object
    const newUser: User = {
      name,
      email: email.toLowerCase(), // Store emails in lowercase for consistency
      password: hashedPassword,
      isAdmin: false, // New users are not admin by default
    };

    // Insert new user into database
    const result = await usersCollection.insertOne(newUser);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertedId },
      process.env.JWT_SECRET || 'fallback_jwt_secret_for_development',
      { expiresIn: '7d' } // Token expires in 7 days
    );

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
    console.error('Error in registration handler:', error);
    
    // Check if it's a duplicate key error
    if (error.code === 11000) {
      return vercelResponse.status(400).json({
        message: 'A user with this email already exists'
      });
    }
    
    // Generic error response
    return vercelResponse.status(500).json({
      message: 'Internal server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}