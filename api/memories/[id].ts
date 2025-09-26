// api/memories/[id].ts
// Vercel Serverless Function for getting, updating, or deleting a specific memory
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import jwt from 'jsonwebtoken';
import { Db, ObjectId } from 'mongodb';

// Define JWT payload type
interface JwtPayload {
  userId: ObjectId;
  iat: number;
  exp: number;
  isAdmin?: boolean;
}

// Define Memory type
interface Memory {
  _id: ObjectId;
  title: string;
  description: string;
  date: Date;
  images: { url: string; publicId: string }[];
  user: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Define User type
interface User {
  _id: ObjectId;
  name: string;
  email: string;
  isAdmin: boolean;
}

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  const { id } = request.query;
  
  // Validate memory ID
  if (!id || Array.isArray(id) || !ObjectId.isValid(id)) {
    return vercelResponse.status(400).json({ 
      message: 'Valid memory ID required' 
    });
  }
  
  const memoryId = new ObjectId(id);
  
  // Extract token from Authorization header
  const authHeader = request.headers.authorization;
  let decoded: JwtPayload | null = null;
  
  if (request.method !== 'GET') { // Authentication required for non-GET requests
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return vercelResponse.status(401).json({
        message: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
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
  }

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    const memoriesCollection = db.collection('memories');
    const usersCollection = db.collection('users');

    if (request.method === 'GET') {
      // Get a specific memory
      const memory = await memoriesCollection.findOne({ _id: memoryId });

      if (!memory) {
        console.log('❌ [MEMORY] Memory not found:', memoryId);
        return vercelResponse.status(404).json({
          message: 'Memory not found',
          memoryId: id
        });
      }

      // Get user info for this memory
      const user = await usersCollection.findOne(
        { _id: memory.user },
        { projection: { name: 1, email: 1 } }
      );

      // Return the memory
      return vercelResponse.status(200).json({
        success: true,
        memory: {
          id: memory._id,
          title: memory.title,
          description: memory.description,
          date: memory.date,
          images: memory.images || [],
          user: user ? {
            id: user._id,
            name: user.name,
            email: user.email
          } : null,
          createdAt: memory.createdAt,
          updatedAt: memory.updatedAt
        }
      });
    } 
    else if (request.method === 'PUT') {
      // Update a memory
      if (!decoded) {
        return vercelResponse.status(401).json({ message: 'Authorization token required' });
      }
      
      // Extract memory data from request body
      const { title, description, date } = request.body;

      // Validate required fields
      if (!title && !description && !date) {
        return vercelResponse.status(400).json({
          message: 'At least one field (title, description, or date) must be provided for update',
          memoryId: id
        });
      }

      // Find the memory to update
      const memory = await memoriesCollection.findOne({ _id: memoryId });
      
      if (!memory) {
        console.log('❌ [MEMORY] Attempt to update non-existent memory:', memoryId);
        return vercelResponse.status(404).json({
          message: 'Memory not found',
          memoryId: id
        });
      }

      // Check if user owns memory or is admin
      const isOwner = memory.user.toString() === decoded.userId.toString();
      
      // Get user to check if admin
      const currentUser = await usersCollection.findOne({ _id: decoded.userId });
      const isAdmin = currentUser?.isAdmin;
      
      if (!isOwner && !isAdmin) {
        console.log('❌ [MEMORY] Unauthorized update attempt - user does not own memory and is not admin:', {
          userId: decoded.userId,
          memoryId: id,
          memoryOwner: memory.user.toString(),
          isAdmin: isAdmin
        });
        return vercelResponse.status(401).json({ 
          message: 'Not authorized - only the creator or admin can edit this memory',
          authorized: false,
          userId: decoded.userId,
          memoryId: id
        });
      }

      // Prepare update data
      const updateData: any = { updatedAt: new Date() };
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (date) updateData.date = new Date(date);

      // Update the memory in the database
      const result = await memoriesCollection.updateOne(
        { _id: memoryId },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return vercelResponse.status(404).json({
          message: 'Memory not found',
          memoryId: id
        });
      }

      // Fetch the updated memory to return
      const updatedMemory = await memoriesCollection.findOne({ _id: memoryId });

      // Return success response
      return vercelResponse.status(200).json({
        success: true,
        message: 'Memory updated successfully',
        memory: {
          id: updatedMemory!._id,
          title: updatedMemory!.title,
          description: updatedMemory!.description,
          date: updatedMemory!.date,
          images: updatedMemory!.images || [],
          user: updatedMemory!.user,
          createdAt: updatedMemory!.createdAt,
          updatedAt: updatedMemory!.updatedAt
        }
      });
    } 
    else if (request.method === 'DELETE') {
      // Delete a memory
      if (!decoded) {
        return vercelResponse.status(401).json({ message: 'Authorization token required' });
      }
      
      // Find the memory to delete
      const memory = await memoriesCollection.findOne({ _id: memoryId });
      
      if (!memory) {
        console.log('❌ [MEMORY] Attempt to delete non-existent memory:', memoryId);
        return vercelResponse.status(404).json({
          message: 'Memory not found',
          memoryId: id
        });
      }

      // Check if user owns memory or is admin
      const isOwner = memory.user.toString() === decoded.userId.toString();
      
      // Get user to check if admin
      const currentUser = await usersCollection.findOne({ _id: decoded.userId });
      const isAdmin = currentUser?.isAdmin;
      
      if (!isOwner && !isAdmin) {
        console.log('❌ [MEMORY] Unauthorized deletion attempt - user does not own memory and is not admin:', {
          userId: decoded.userId,
          memoryId: id,
          memoryOwner: memory.user.toString(),
          isAdmin: isAdmin
        });
        return vercelResponse.status(401).json({ 
          message: 'Not authorized - only the creator or admin can delete this memory',
          authorized: false,
          userId: decoded.userId,
          memoryId: id
        });
      }

      // Delete the memory from the database
      const result = await memoriesCollection.deleteOne({ _id: memoryId });

      if (result.deletedCount === 0) {
        return vercelResponse.status(404).json({
          message: 'Memory not found',
          memoryId: id
        });
      }

      console.log('✅ [MEMORY] Memory deleted successfully:', memoryId);
      
      // Return success response
      return vercelResponse.status(200).json({
        success: true,
        message: 'Memory deleted successfully',
        memoryId: id
      });
    } 
    else {
      // Method not allowed
      return vercelResponse.status(405).json({ 
        message: 'Method not allowed' 
      });
    }
  } catch (error: any) {
    console.error('❌ [MEMORY] Error in memory handler:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      userId: decoded?.userId,
      memoryId: id,
      ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress
    });
    
    return vercelResponse.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      memoryId: id
    });
  }
}