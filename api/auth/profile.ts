// api/auth/profile.ts
// Vercel Serverless Function for getting user profile
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db';
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

// Define JWT payload type
interface JwtPayload {
  userId: ObjectId;
  iat: number;
  exp: number;
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return vercelResponse.status(401).json({
        message: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'fallback_jwt_secret_for_development'
      ) as JwtPayload;
    } catch (error) {
      return vercelResponse.status(401).json({
        message: 'Invalid or expired token'
      });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Find user by ID from token
    const user = await usersCollection.findOne(
      { _id: decoded.userId },
      { projection: { password: 0 } } // Exclude password
    );
    
    // If user not found
    if (!user) {
      return vercelResponse.status(404).json({
        message: 'User not found'
      });
    }

    // Return user profile
    return vercelResponse.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error: any) {
    console.error('Error in profile handler:', error);
    
    return vercelResponse.status(500).json({
      message: 'Internal server error while fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}