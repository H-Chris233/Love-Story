// api/anniversaries/remind.ts
// Vercel Serverless Function for sending anniversary reminders to all users
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { sendAnniversaryReminderToAllUsers } from '../../lib/email.js';
import logger from '../../lib/logger.js';
import { getClientIP } from '../utils.js';

// Verify environment variables for detailed logging
const emailjsServiceId = process.env.EMAILJS_SERVICE_ID;
const emailjsTemplateId = process.env.EMAILJS_TEMPLATE_ID;
const emailjsTodayTemplateId = process.env.EMAILJS_TODAY_TEMPLATE_ID;
const emailjsPublicKey = process.env.EMAILJS_PUBLIC_KEY;
const emailjsPrivateKey = process.env.EMAILJS_PRIVATE_KEY;

logger.email('Initializing anniversary reminder service', {
  hasServiceId: !!emailjsServiceId,
  hasReminderTemplate: !!emailjsTemplateId,
  hasTodayTemplate: !!emailjsTodayTemplateId,
  hasPublicKey: !!emailjsPublicKey,
  hasPrivateKey: !!emailjsPrivateKey
});

if (!emailjsServiceId || !emailjsTemplateId || !emailjsTodayTemplateId || !emailjsPublicKey || !emailjsPrivateKey) {
  logger.warn('Missing EmailJS configuration. Email functionality will not work properly!', {
    missingConfigs: {
      serviceId: !emailjsServiceId,
      reminderTemplate: !emailjsTemplateId,
      todayTemplate: !emailjsTodayTemplateId,
      publicKey: !emailjsPublicKey,
      privateKey: !emailjsPrivateKey
    }
  });
}

// Define JWT payload type
interface JwtPayload {
  userId: ObjectId;
  iat: number;
  exp: number;
  isAdmin?: boolean;
}



export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  const ip = getClientIP(request);
  
  logger.anniversary('Anniversary reminder request received', {
    path: request.url,
    method: request.method,
    timestamp: new Date().toISOString(),
    ip
  });

  // Extract token from Authorization header
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Authorization token required for anniversary reminder', {
      path: request.url,
      method: request.method,
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
    
    logger.debug('JWT token verified successfully', {
      userId: decoded.userId.toString(),
      ip
    });
  } catch (error) {
    logger.warn('Invalid or expired JWT token', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip
    });
    
    return vercelResponse.status(401).json({
      message: 'Invalid or expired token'
    });
  }

  // This endpoint only accepts POST requests
  if (request.method !== 'POST') {
    logger.warn('Method not allowed for anniversary reminder', {
      method: request.method,
      allowedMethods: ['POST'],
      ip
    });
    
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    const anniversariesCollection = db.collection('anniversaries');
    const usersCollection = db.collection('users');

    // Get all users
    const users = await usersCollection.find({}, { projection: { name: 1, email: 1 } }).toArray();
    
    if (users.length === 0) {
      console.log(`❌ [ANNIVERSARY] - No users found in the system`);
      return vercelResponse.status(404).json({ message: 'No users found in the system' });
    }

    const userList = users.map((user: { email: string; name: string }) => ({
      email: user.email,
      name: user.name
    }));

    // Check if this is a test request for all reminders
    if (request.body.testAllReminders) {
        logger.anniversary('Test all reminders request received', {
        userId: decoded.userId.toString(),
        timeframe: 'next 7 days',
        ip
      });

      // Fetch all anniversaries
      const anniversaries: Anniversary[] = await anniversariesCollection
        .find({})
        .toArray();

      logger.anniversary('Found anniversaries for testing', {
        totalAnniversaries: anniversaries.length,
        userId: decoded.userId.toString()
      });

      // Track results
      let totalSent = 0;
      let totalFailed = 0;
      const failedAnniversaries: string[] = [];

      // Check each anniversary for upcoming dates (next 7 days)
      for (const anniversary of anniversaries) {
        try {
          // Calculate days until anniversary
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Normalize to start of day
          
          const anniversaryDate = new Date(anniversary.date);
          anniversaryDate.setHours(0, 0, 0, 0); // Normalize to start of day
          
          // Calculate the difference in days
          const timeDiff = anniversaryDate.getTime() - today.getTime();
          const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          logger.debug('Checking anniversary for test sending', {
            anniversaryTitle: anniversary.title,
            daysUntil,
            anniversaryDate: anniversary.date.toISOString().split('T')[0]
          });

          // Test send if the anniversary is within the next 7 days
          if (daysUntil >= 0 && daysUntil <= 7) {
            logger.anniversary('Testing reminder for anniversary', {
              anniversaryTitle: anniversary.title,
              daysUntil,
              totalUsers: userList.length
            });
            
            // Determine if this is a same-day reminder
            const isToday = daysUntil === 0;
            
            // Send email reminder to all users
            const result = await sendAnniversaryReminderToAllUsers(
              userList,
              anniversary.title,
              anniversary.date,
              isToday
            );
            
            totalSent += result.successful;
            totalFailed += result.failed;
            
            if (result.failed > 0) {
              failedAnniversaries.push(anniversary.title);
              console.log(`🧪 [ANNIVERSARY] Failed to send some reminders for "${anniversary.title}": ${result.failed} failed`);
              if (result.errors) {
                console.log(`🧪 [ANNIVERSARY] Errors:`, result.errors);
              }
            }
            
            console.log(`🧪 [ANNIVERSARY] Completed test sending for "${anniversary.title}": ${result.successful} successful, ${result.failed} failed`);
          } else {
            console.log(`🧪 [ANNIVERSARY] Skipping "${anniversary.title}" (in ${daysUntil} days - outside 0-7 day range)`);
          }
        } catch (anniversaryError: unknown) {
          console.error(`❌ [ANNIVERSARY] Error processing anniversary "${anniversary.title}" during test:`, anniversaryError instanceof Error ? anniversaryError.message : 'Unknown error');
          totalFailed++;
          failedAnniversaries.push(anniversary.title);
        }
      }

      console.log(`🧪 [ANNIVERSARY] Completed test of all reminders`);
      console.log(`🧪 [ANNIVERSARY] Summary: ${totalSent} sent, ${totalFailed} failed`);

      return vercelResponse.status(200).json({
        message: 'Test of all anniversary reminders completed',
        details: {
          sent: totalSent,
          failed: totalFailed,
          testedAnniversaries: anniversaries.length,
          failedAnniversaries,
          timeframe: 'next 7 days'
        }
      });
    } else {
      // This is a request to send reminder for a specific anniversary
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
      console.log(`📤 [ANNIVERSARY] - Found ${users.length} users in database`);

      users.forEach((user: { email: string; name: string }, index) => {
        console.log(`📤 [ANNIVERSARY] - User ${index + 1}: ${user.name} <${user.email}>`);
      });

      console.log(`📤 [ANNIVERSARY] - Starting email sending process for "${anniversary.title}"...`);
      
      // Calculate if this is a same-day reminder
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      const anniversaryDate = new Date(anniversary.date);
      anniversaryDate.setHours(0, 0, 0, 0);
      const timeDiff = anniversaryDate.getTime() - currentDate.getTime();
      const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));
      const isToday = daysUntil === 0;
      
      // Send email reminder to all users
      const result = await sendAnniversaryReminderToAllUsers(
        userList,
        anniversary.title,
        anniversary.date,
        isToday
      );

      console.log(`✅ [ANNIVERSARY] - Email sending completed for "${anniversary.title}"`);
      console.log(`✅ [ANNIVERSARY] - Results: ${result.successful} successful, ${result.failed} failed`);

      return vercelResponse.status(200).json({ 
        message: 'Anniversary reminders sent',
        details: {
          successful: result.successful,
          failed: result.failed,
          totalUsers: users.length,
          errors: result.errors?.map(e => `${e.email}: ${e.error}`) || []
        }
      });
    }
  } catch (error: unknown) {
    console.error(`❌ [ANNIVERSARY] - Error in sendReminder:`, error);
    console.error(`❌ [ANNIVERSARY] - Error message:`, error instanceof Error ? error.message : 'Unknown error');
    
    return vercelResponse.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}