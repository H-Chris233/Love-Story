// api/anniversaries/test-reminders.ts
// Vercel Serverless Function for testing sending all anniversary reminders
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import jwt from 'jsonwebtoken';
import { Db, ObjectId } from 'mongodb';
import { triggerManualReminderCheck } from '../../lib/scheduler.js';

// Define JWT payload type
interface JwtPayload {
  userId: ObjectId;
  iat: number;
  exp: number;
  isAdmin?: boolean;
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

  console.log(`🧪 [ANNIVERSARY] POST /api/anniversaries/test-reminders - Test all reminders request`);
  console.log(`🧪 [ANNIVERSARY] - Request from user: ${decoded.userId}`);
  console.log(`🧪 [ANNIVERSARY] - This will test send reminders for anniversaries within next 7 days`);

  try {
    console.log(`🧪 [ANNIVERSARY] - Triggering manual reminder check...`);
    const result = await triggerManualReminderCheck();
    
    if (result.success) {
      console.log(`✅ [ANNIVERSARY] - Test completed successfully`);
      console.log(`✅ [ANNIVERSARY] - Results: ${result.details?.sent || 0} sent, ${result.details?.failed || 0} failed`);
      
      return vercelResponse.status(200).json({
        message: result.message,
        details: result.details
      });
    } else {
      console.log(`❌ [ANNIVERSARY] - Test failed: ${result.message}`);
      
      return vercelResponse.status(400).json({
        message: result.message
      });
    }
  } catch (error: any) {
    console.error(`❌ [ANNIVERSARY] - Error in testSendAllReminders:`, error);
    console.error(`❌ [ANNIVERSARY] - Error message: ${error.message}`);
    
    return vercelResponse.status(500).json({ message: error.message });
  }
}