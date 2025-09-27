// lib/types.ts
// Shared types for serverless functions
import { ObjectId } from 'mongodb';

// Define JWT payload type - after JWT decode, ObjectId becomes string
export interface JwtPayload {
  userId: string | ObjectId;
  iat: number;
  exp: number;
  isAdmin?: boolean;
}

// Helper function to convert userId to ObjectId for database queries
export const toObjectId = (userId: string | ObjectId): ObjectId => {
  return typeof userId === 'string' ? new ObjectId(userId) : userId;
};

// Anniversary type
export interface Anniversary {
  _id?: ObjectId;
  title: string;
  date: Date;
  reminderDays: number[];
  createdAt: Date;
  updatedAt: Date;
}

// User type
export interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Memory type
export interface Memory {
  _id?: ObjectId;
  title: string;
  description: string;
  date: Date;
  images: string[];
  user: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Memory with images type
export interface MemoryWithImages extends Memory {
  images: string[];
}