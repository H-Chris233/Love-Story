// api/anniversaries/remind.ts
// Vercel Serverless Function for sending anniversary reminders to all users
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import jwt from 'jsonwebtoken';
import { Db, ObjectId } from 'mongodb';
import { sendAnniversaryReminderToAllUsers } from '../../lib/email';

// Define JWT payload type
interface JwtPayload {
  userId: ObjectId;
  iat: number;
  exp: number;
  isAdmin?: boolean;
}

// Define Anniversary type
interface Anniversary {
  _id: ObjectId;
  title: string;
  date: Date;
  reminderDays: number;
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

  // This endpoint only accepts POST requests
  if (request.method !== 'POST') {
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  // Extract anniversary ID from request body
  const { anniversaryId } = request.body;

  // Validate anniversary ID
  if (!anniversaryId || !ObjectId.isValid(anniversaryId)) {
    return vercelResponse.status(400).json({ 
      message: 'Valid anniversary ID required' 
    });
  }

  const anniversaryObjectId = new ObjectId(anniversaryId);

  console.log(`📤 [ANNIVERSARY] POST /api/anniversaries/remind - Single anniversary reminder request`);
  console.log(`📤 [ANNIVERSARY] - Request from user: ${decoded.userId}`);

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    const anniversariesCollection = db.collection('anniversaries');
    const usersCollection = db.collection('users');

    console.log(`📤 [ANNIVERSARY] - Looking up anniversary by ID: ${anniversaryId}`);
    
    // Find the anniversary
    const anniversary = await anniversariesCollection.findOne({ _id: anniversaryObjectId });

    if (!anniversary) {
      console.log(`❌ [ANNIVERSARY] - Anniversary not found: ${anniversaryId}`);
      return vercelResponse.status(404).json({ message: 'Anniversary not found' });
    }

    console.log(`📤 [ANNIVERSARY] - Found anniversary: "${anniversary.title}"`);
    console.log(`📤 [ANNIVERSARY] - Anniversary date: ${anniversary.date.toISOString().split('T')[0]}`);
    console.log(`📤 [ANNIVERSARY] - Reminder days: ${anniversary.reminderDays}`);

    console.log(`📤 [ANNIVERSARY] - Fetching all users from database...`);
    
    // Get all users
    const users = await usersCollection.find({}, { projection: { name: 1, email: 1 } }).toArray();
    console.log(`📤 [ANNIVERSARY] - Found ${users.length} users in database`);
    
    if (users.length === 0) {
      console.log(`❌ [ANNIVERSARY] - No users found in the system`);
      return vercelResponse.status(404).json({ message: 'No users found in the system' });
    }

    users.forEach((user: any, index) => {
      console.log(`📤 [ANNIVERSARY] - User ${index + 1}: ${user.name} <${user.email}>`);
    });

    const userList = users.map((user: any) => ({
      email: user.email,
      name: user.name
    }));

    console.log(`📤 [ANNIVERSARY] - Starting email sending process for "${anniversary.title}"...`);
    
    // Send email reminder to all users
    const result = await sendAnniversaryReminderToAllUsers(
      userList,
      anniversary.title,
      anniversary.date
    );

    console.log(`✅ [ANNIVERSARY] - Email sending completed for "${anniversary.title}"`);
    console.log(`✅ [ANNIVERSARY] - Results: ${result.successful} successful, ${result.failed} failed`);

    return vercelResponse.status(200).json({ 
      message: 'Anniversary reminders sent',
      details: {
        successful: result.successful,
        failed: result.failed,
        totalUsers: users.length,
        errors: result.errors
      }
    });
  } catch (error: any) {
    console.error(`❌ [ANNIVERSARY] - Error in sendReminder:`, error);
    console.error(`❌ [ANNIVERSARY] - Error message: ${error.message}`);
    
    return vercelResponse.status(500).json({ message: error.message });
  }
}