// api/auth/users/[userId].ts
// Vercel Serverless Function for user operations by ID
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../../lib/db.js';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import logger from '../../../lib/logger.js';
import { getClientIP } from '../../utils.js';
import { JwtPayload, toObjectId } from '../../../lib/types.js';

// Define User type
interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string; // This will be hashed
  isAdmin: boolean;
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  const { method } = request;
  const { userId } = request.query;
  const ip = getClientIP(request);

  if (method === 'DELETE') {
    // Delete user endpoint: /api/auth/users/:userId
    logger.controller('Starting user deletion', {
      targetUserId: userId,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });

    // Validate user ID
    if (!userId || Array.isArray(userId) || !ObjectId.isValid(userId)) {
      logger.warn('Invalid user ID provided for deletion', {
        userId: Array.isArray(userId) ? userId.join(',') : String(userId || 'undefined'),
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
        ip
      });
      
      return vercelResponse.status(400).json({ 
        message: 'Valid user ID required' 
      });
    }
    
    const targetUserId = new ObjectId(userId as string);

    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Authorization token required for user deletion', {
          targetUserId: userId,
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          ip
        });
        
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
      } catch (_error: unknown) {
        logger.warn('Invalid or expired token for user deletion', {
          targetUserId: userId,
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          ip
        });
        
        return vercelResponse.status(401).json({
          message: 'Invalid or expired token'
        });
      }

      // Connect to database
      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');

      // Check if current user is admin
      const currentUser = await usersCollection.findOne({ _id: toObjectId(decoded.userId.toString()) });
      if (!currentUser?.isAdmin) {
        logger.warn('Unauthorized delete attempt - user is not admin', {
          userId: decoded.userId?.toString(),
          targetUserId: userId,
          timestamp: new Date().toISOString()
        });
        
        return vercelResponse.status(403).json({
          message: 'Access denied - admin privileges required'
        });
      }

      // Prevent admin from deleting themselves
      if (decoded.userId.toString() === userId) {
        logger.warn('Admin attempting to delete themselves', {
          userId: decoded.userId?.toString(),
          timestamp: new Date().toISOString()
        });
        
        return vercelResponse.status(400).json({
          message: 'Cannot delete your own account'
        });
      }

      // Find the user to delete
      const user = await usersCollection.findOne({ _id: targetUserId }, { projection: { name: 1, email: 1 } });
      
      if (!user) {
        logger.warn('User not found for deletion', {
          userId: targetUserId.toString(),
          timestamp: new Date().toISOString()
        });
        
        return vercelResponse.status(404).json({
          message: 'User not found'
        });
      }

      // Delete the user from the database
      const result = await usersCollection.deleteOne({ _id: targetUserId });

      if (result.deletedCount === 0) {
        logger.warn('No user was deleted from database', {
          userId: targetUserId.toString(),
          timestamp: new Date().toISOString()
        });
        
        return vercelResponse.status(404).json({
          message: 'User not found'
        });
      }

      logger.controller('User deleted successfully', {
        deletedUserId: userId,
        deletedUserEmail: user.email,
        adminId: decoded.userId?.toString(),
        timestamp: new Date().toISOString()
      });

      // Return success response
      return vercelResponse.status(200).json({
        message: 'User deleted successfully',
        deletedUser: {
          id: userId,
          name: user.name,
          email: user.email
        }
      });
    } catch (error: unknown) {
      logger.error('Error deleting user', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        targetUserId: userId,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip
      });
      
      return vercelResponse.status(500).json({
        message: error instanceof Error ? error.message : 'Internal server error during user deletion'
      });
    }
  } else {
    // Method not allowed
    logger.warn('Method not allowed for user ID endpoint', {
      path: request.url,
      method: request.method,
      userId: Array.isArray(userId) ? userId.join(',') : String(userId || 'undefined'),
      timestamp: new Date().toISOString(),
      ip
    });
    
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }
}