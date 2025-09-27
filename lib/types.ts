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