// api/auth/[endpoint].ts
// Vercel Serverless Function for authentication-related operations
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import { hash, compare } from 'bcrypt';
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

  if (endpoint === 'register' && method === 'POST') {
    // Register endpoint: /api/auth/register
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
  } else if (endpoint === 'login' && method === 'POST') {
    // Login endpoint: /api/auth/login
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
      const token = generateToken(user._id);

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
        message: error.message || 'Internal server error during login'
      });
    }
  } else if (endpoint === 'profile' && method === 'GET') {
    // Get user profile endpoint: /api/auth/profile
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
        message: error.message || 'Internal server error while fetching profile'
      });
    }
  } else if (endpoint === 'users' && method === 'GET') {
    // Get all users endpoint: /api/auth/users
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

      // Check if current user is admin
      const currentUser = await usersCollection.findOne({ _id: decoded.userId });
      if (!currentUser?.isAdmin) {
        console.log('❌ [USERS] Unauthorized access attempt - user is not admin:', decoded.userId);
        return vercelResponse.status(403).json({
          message: 'Access denied - admin privileges required'
        });
      }

      // Get all users (excluding passwords)
      const users = await usersCollection.find({}, { projection: { password: 0 } }).sort({ createdAt: -1 }).toArray();

      console.log('✅ [USERS] Successfully fetched users:', {
        count: users.length,
        adminId: decoded.userId,
        timestamp: new Date().toISOString()
      });

      // Return users (excluding passwords)
      return vercelResponse.status(200).json(users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      })));
    } catch (error: any) {
      console.error('❌ [USERS] Error fetching users:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
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
      return vercelResponse.status(400).json({ 
        message: 'Valid user ID required' 
      });
    }
    
    const targetUserId = new ObjectId(userId);

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

      // Check if current user is admin
      const currentUser = await usersCollection.findOne({ _id: decoded.userId });
      if (!currentUser?.isAdmin) {
        console.log('❌ [USER] Unauthorized delete attempt - user is not admin:', decoded.userId);
        return vercelResponse.status(403).json({
          message: 'Access denied - admin privileges required'
        });
      }

      // Prevent admin from deleting themselves
      if (decoded.userId.toString() === userId) {
        console.log('❌ [USER] Admin attempting to delete themselves:', decoded.userId);
        return vercelResponse.status(400).json({
          message: 'Cannot delete your own account'
        });
      }

      // Find the user to delete
      const user = await usersCollection.findOne({ _id: targetUserId }, { projection: { name: 1, email: 1 } });
      
      if (!user) {
        console.log('❌ [USER] User not found for deletion:', userId);
        return vercelResponse.status(404).json({
          message: 'User not found'
        });
      }

      // Delete the user from the database
      const result = await usersCollection.deleteOne({ _id: targetUserId });

      if (result.deletedCount === 0) {
        return vercelResponse.status(404).json({
          message: 'User not found'
        });
      }

      console.log('✅ [USER] User deleted successfully:', {
        deletedUserId: userId,
        deletedUserEmail: user.email,
        adminId: decoded.userId,
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
    } catch (error: any) {
      console.error('❌ [USER] Error deleting user:', {
        error: error.message,
        stack: error.stack,
        targetUserId: userId,
        timestamp: new Date().toISOString()
      });
      
      return vercelResponse.status(500).json({
        message: error.message || 'Internal server error during user deletion'
      });
    }
  } else if (endpoint === 'check-registration' && method === 'GET') {
    // Check registration allowed endpoint: /api/auth/check-registration
    try {
      // Connect to database
      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');

      // Count users in the database
      const userCount = await usersCollection.countDocuments();

      // Check if registration is allowed (for example, allow registration when there are no users yet)
      const registrationAllowed = userCount === 0;

      return vercelResponse.status(200).json({
        registrationAllowed,
        message: userCount === 0
          ? 'Registration allowed for first admin user'
          : 'Registration not allowed'
      });
    } catch (error: any) {
      console.error('Error in check registration handler:', error);
      
      return vercelResponse.status(500).json({
        message: error.message || 'Internal server error during registration check'
      });
    }
  } else {
    // Method not allowed or invalid endpoint
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed or invalid endpoint' 
    });
  }
}