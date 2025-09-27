// api/auth/[endpoint].ts
// Vercel Serverless Function for authentication-related operations
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import logger from '../../lib/logger.js';
import { getClientIP } from '../utils.js';
import { JwtPayload, toObjectId } from '../../lib/types.js';

// Define User type
interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string; // This will be hashed
  isAdmin: boolean;
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
  const { method } = request;
  const { endpoint } = request.query;
  const ip = getClientIP(request);

  if (endpoint === 'register' && method === 'POST') {
    // Register endpoint: /api/auth/register
    logger.controller('Starting user registration', {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });

    try {
      // Connect to database
      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');

      // Extract user data from request body
      const { name, email, password } = request.body;

      // Validate required fields
      if (!name || !email || !password) {
        logger.warn('Missing required fields in registration request', {
          missingFields: [
            !name && 'name',
            !email && 'email', 
            !password && 'password'
          ].filter(Boolean),
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          ip
        });
        
        return vercelResponse.status(400).json({
          message: 'Please provide name, email, and password'
        });
      }

      // Validate email format (simple validation)
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        logger.warn('Invalid email format in registration request', {
          email,
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          ip
        });
        
        return vercelResponse.status(400).json({
          message: 'Please provide a valid email'
        });
      }

      // Check if user already exists
      const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        logger.warn('Registration attempt with existing email', {
          email,
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          ip
        });
        
        return vercelResponse.status(400).json({
          message: 'User with this email already exists'
        });
      }

      // Validate password length
      if (password.length < 6) {
        logger.warn('Password too short in registration request', {
          passwordLength: password.length,
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          ip
        });
        
        return vercelResponse.status(400).json({
          message: 'Password must be at least 6 characters long'
        });
      }

      // Check if this is the first user (should be admin)
      const userCount = await usersCollection.countDocuments();
      const isFirstUser = userCount === 0;

      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new user object
      const newUser: User = {
        name,
        email: email.toLowerCase(), // Store emails in lowercase for consistency
        password: hashedPassword,
        isAdmin: isFirstUser, // First user gets admin privileges
      };

      // Insert new user into database
      const result = await usersCollection.insertOne(newUser);
      
      // Generate JWT token
      const token = generateToken(result.insertedId);

      logger.controller('User registered successfully', {
        userId: result.insertedId.toString(),
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        isFirstUser,
        timestamp: new Date().toISOString()
      });

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
    } catch (error: unknown) {
      logger.error('Registration failed', {
        error: error.message,
        stack: error.stack,
        requestBody: { name: request.body?.name, email: request.body?.email, password: '***' },
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip
      });
      
      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values((error as { errors: Record<string, { message: string }> }).errors).map((err: { message: string }) => err.message);
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
  } else if (endpoint === 'login' && method === 'POST') {
    // Login endpoint: /api/auth/login
    logger.controller('Starting user login', {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });

    try {
      // Connect to database
      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');

      // Extract email and password from request body
      const { email, password } = request.body;

      // Validate required fields
      if (!email || !password) {
        logger.warn('Missing email or password in login request', {
          hasEmail: !!email,
          hasPassword: !!password,
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          ip
        });
        
        return vercelResponse.status(400).json({
          message: 'Please provide email and password'
        });
      }

      // Find user by email (case insensitive)
      const user = await usersCollection.findOne({ email: email.toLowerCase() });
      
      // If user not found or password doesn't match
      if (!user || !(await bcrypt.compare(password, user.password))) {
        logger.warn('Invalid email or password in login attempt', {
          email,
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          ip
        });
        
        return vercelResponse.status(401).json({
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = generateToken(user._id);

      logger.controller('User login successful', {
        userId: user._id.toString(),
        email: user.email,
        timestamp: new Date().toISOString()
      });

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
    } catch (error: unknown) {
      logger.error('Error in login handler', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip
      });
      
      return vercelResponse.status(500).json({
        message: error.message || 'Internal server error during login'
      });
    }
  } else if (endpoint === 'profile' && method === 'GET') {
    // Get user profile endpoint: /api/auth/profile
    logger.controller('Fetching user profile', {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });

    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Authorization token required for profile access', {
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
        logger.warn('Invalid or expired token for profile access', {
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

      // Find user by ID from token
      const user = await usersCollection.findOne(
        { _id: toObjectId(decoded.userId) },
        { projection: { password: 0 } } // Exclude password
      );
      
      // If user not found
      if (!user) {
        logger.warn('User not found for profile request', {
          userId: decoded.userId?.toString(),
          token: token.substring(0, 10) + '...',
          timestamp: new Date().toISOString()
        });
        
        return vercelResponse.status(404).json({
          message: 'User not found'
        });
      }

      logger.controller('Successfully fetched user profile', {
        userId: user._id.toString(),
        email: user.email,
        timestamp: new Date().toISOString()
      });

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
    } catch (error: unknown) {
      logger.error('Error in profile handler', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip
      });
      
      return vercelResponse.status(500).json({
        message: error.message || 'Internal server error while fetching profile'
      });
    }
  } else if (endpoint === 'users' && method === 'GET') {
    // Get all users endpoint: /api/auth/users
    logger.controller('Fetching all users', {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });

    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Authorization token required for users access', {
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
        logger.warn('Invalid or expired token for users access', {
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
      const currentUser = await usersCollection.findOne({ _id: toObjectId(decoded.userId) });
      if (!currentUser?.isAdmin) {
        logger.warn('Unauthorized access attempt - user is not admin', {
          userId: decoded.userId?.toString(),
          timestamp: new Date().toISOString()
        });
        
        return vercelResponse.status(403).json({
          message: 'Access denied - admin privileges required'
        });
      }

      // Get all users (excluding passwords)
      const users = await usersCollection.find({}, { projection: { password: 0 } }).sort({ createdAt: -1 }).toArray();

      logger.controller(`Successfully fetched users: ${users.length}`, {
        count: users.length,
        adminId: decoded.userId?.toString(),
        timestamp: new Date().toISOString()
      });

      // Return users (excluding passwords)
      return vercelResponse.status(200).json(users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      })));
    } catch (error: unknown) {
      logger.error('Error fetching users', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip
      });
      
      return vercelResponse.status(500).json({
        message: error.message || 'Internal server error while fetching users'
      });
    }
  } else if (endpoint === 'users' && method === 'DELETE') {
    // Delete user endpoint (requires userId in query params): /api/auth/users/:userId
    const { userId } = request.query;
    
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
    
    const targetUserId = new ObjectId(userId);

    logger.controller('Starting user deletion', {
      targetUserId: userId,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });

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
      const currentUser = await usersCollection.findOne({ _id: toObjectId(decoded.userId) });
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
        error: error.message,
        stack: error.stack,
        targetUserId: userId,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip
      });
      
      return vercelResponse.status(500).json({
        message: error.message || 'Internal server error during user deletion'
      });
    }
  } else if (endpoint === 'check-registration' && method === 'GET') {
    // Check registration allowed endpoint: /api/auth/check-registration
    logger.controller('Checking if registration is allowed', {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      ip
    });

    try {
      // Connect to database
      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');

      // Count users in the database
      const userCount = await usersCollection.countDocuments();

      // Check if registration is allowed (for example, allow registration when there are no users yet)
      const registrationAllowed = userCount === 0;

      logger.controller('Registration check completed', {
        registrationAllowed,
        userCount,
        timestamp: new Date().toISOString()
      });

      return vercelResponse.status(200).json({
        registrationAllowed,
        message: userCount === 0
          ? 'Registration allowed for first admin user'
          : 'Registration not allowed'
      });
    } catch (error: unknown) {
      logger.error('Error in check registration handler', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip
      });
      
      return vercelResponse.status(500).json({
        message: error.message || 'Internal server error during registration check'
      });
    }
  } else {
    // Method not allowed or invalid endpoint
    logger.warn('Method not allowed or invalid endpoint', {
      path: request.url,
      method: request.method,
      endpoint,
      timestamp: new Date().toISOString(),
      ip
    });
    
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed or invalid endpoint' 
    });
  }
}