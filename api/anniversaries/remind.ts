// api/anniversaries/remind.ts
// Vercel Serverless Function for sending anniversary reminders to all users
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import jwt from 'jsonwebtoken';
import { Db, ObjectId } from 'mongodb';
import emailjs from '@emailjs/nodejs';

console.log(`📧 [EMAIL_INIT] ==========================================`);
console.log(`📧 [EMAIL_INIT] INITIALIZING EMAILJS NODE.JS SERVICE FOR SERVERLESS`);
console.log(`📧 [EMAIL_INIT] ==========================================`);

// Verify environment variables
const emailjsServiceId = process.env.EMAILJS_SERVICE_ID;
const emailjsTemplateId = process.env.EMAILJS_TEMPLATE_ID;
const emailjsTodayTemplateId = process.env.EMAILJS_TODAY_TEMPLATE_ID;
const emailjsPublicKey = process.env.EMAILJS_PUBLIC_KEY;
const emailjsPrivateKey = process.env.EMAILJS_PRIVATE_KEY;

console.log(`📧 [EMAIL_INIT] Checking EmailJS configuration...`);
console.log(`📧 [EMAIL_INIT] - Service ID: ${emailjsServiceId ? '✅ Set' : '❌ Not set'}`);
console.log(`📧 [EMAIL_INIT] - Reminder Template ID: ${emailjsTemplateId ? '✅ Set' : '❌ Not set'}`);
console.log(`📧 [EMAIL_INIT] - Today Template ID: ${emailjsTodayTemplateId ? '✅ Set' : '❌ Not set'}`);
console.log(`📧 [EMAIL_INIT] - Public Key: ${emailjsPublicKey ? '✅ Set' : '❌ Not set'}`);
console.log(`📧 [EMAIL_INIT] - Private Key: ${emailjsPrivateKey ? '✅ Set' : '❌ Not set'}`);
console.log(`✅ [EMAIL_INIT] EmailJS Node.js service initialized for serverless environment`);
console.log(`📧 [EMAIL_INIT] ==========================================\n`);

if (!emailjsServiceId || !emailjsTemplateId || !emailjsTodayTemplateId || !emailjsPublicKey || !emailjsPrivateKey) {
  console.warn(`⚠️  [EMAIL_INIT] Missing EmailJS configuration. Email functionality will not work properly!`);
}

// Send anniversary reminder email
const sendAnniversaryReminder = async (
  toEmail: string,
  userName: string,
  anniversaryTitle: string,
  anniversaryDate: Date
): Promise<unknown> => {
  console.log(`📧 [EMAIL] Starting email preparation for: ${toEmail}`);
  console.log(`📧 [EMAIL] - User: ${userName}`);
  console.log(`📧 [EMAIL] - Anniversary: ${anniversaryTitle}`);
  console.log(`📧 [EMAIL] - Date: ${anniversaryDate.toISOString()}`);
  
  try {
    const currentDate = new Date();
    const timeDiff = anniversaryDate.getTime() - currentDate.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    console.log(`📧 [EMAIL] - Days calculation: ${daysLeft} days left`);
    
    // Format anniversary date
    const anniversaryDateFormatted = anniversaryDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Get weekday
    const anniversaryWeekday = anniversaryDate.toLocaleDateString('zh-CN', {
      weekday: 'long'
    });
    
    // Format current date
    const currentDateFormatted = currentDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    console.log(`📧 [EMAIL] - Formatted anniversary date: ${anniversaryDateFormatted}`);
    console.log(`📧 [EMAIL] - Anniversary weekday: ${anniversaryWeekday}`);
    console.log(`📧 [EMAIL] - Current date: ${currentDateFormatted}`);

    // Choose template and parameters based on days left
    let templateId: string;
    let emailType: string;
    let templateParams: Record<string, string>;
    
    const baseParams = {
      anniversary_name: anniversaryTitle,
      anniversary_date_formatted: anniversaryDateFormatted,
      anniversary_weekday: anniversaryWeekday,
      current_date: currentDateFormatted,
      name: userName,
      email: toEmail,
    };
    
    if (daysLeft === 0) {
      // Today is the anniversary - use celebration template
      templateId = emailjsTodayTemplateId;
      emailType = 'CELEBRATION';
      templateParams = baseParams; // No days_left parameter for celebration
      console.log(`🎉 [EMAIL] - Today is the anniversary! Using celebration template`);
    } else {
      // Future anniversary - use reminder template  
      templateId = emailjsTemplateId;
      emailType = 'REMINDER';
      templateParams = {
        ...baseParams,
        days_left: daysLeft.toString(),
      };
      console.log(`📅 [EMAIL] - ${daysLeft} days until anniversary. Using reminder template`);
    }

    console.log(`📧 [EMAIL] - Email type: ${emailType}`);
    console.log(`📧 [EMAIL] - Template parameters prepared:`, JSON.stringify(templateParams, null, 2));
    console.log(`📧 [EMAIL] - Using EmailJS config:`);
    console.log(`📧 [EMAIL]   - Service ID: ${emailjsServiceId}`);
    console.log(`📧 [EMAIL]   - Template ID: ${templateId}`);
    console.log(`📧 [EMAIL]   - Public Key: ${emailjsPublicKey ? 'Set' : 'Not set'}`);
    console.log(`📧 [EMAIL]   - Private Key: ${emailjsPrivateKey ? 'Set' : 'Not set'}`);

    if (!emailjsServiceId || !templateId || !emailjsPublicKey || !emailjsPrivateKey) {
      throw new Error('Missing required EmailJS configuration');
    }

    console.log(`📧 [EMAIL] - Sending ${emailType} email via EmailJS Node.js...`);
    const response = await emailjs.send(
      emailjsServiceId, 
      templateId, 
      templateParams,
      {
        publicKey: emailjsPublicKey,
        privateKey: emailjsPrivateKey,
      }
    );
    
    console.log(`✅ [EMAIL] - Email sent successfully to ${toEmail}`);
    console.log(`✅ [EMAIL] - EmailJS response:`, JSON.stringify(response, null, 2));
    return response;
  } catch (error: unknown) {
    console.error(`❌ [EMAIL] - Failed to send email to ${toEmail}:`, error);
    if (error instanceof Error) {
      console.error(`❌ [EMAIL] - Error message: ${error.message}`);
      console.error(`❌ [EMAIL] - Error stack: ${error.stack}`);
    }
    throw new Error(`Failed to send email to ${toEmail}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Send anniversary reminder to all users
const sendAnniversaryReminderToAllUsers = async (
  users: Array<{ email: string; name: string }>,
  anniversaryTitle: string,
  anniversaryDate: Date
): Promise<{ successful: number; failed: number; errors: string[] }> => {
  console.log(`🚀 [BATCH_EMAIL] Starting batch email sending for anniversary: "${anniversaryTitle}"`);
  console.log(`🚀 [BATCH_EMAIL] Total users to send to: ${users.length}`);
  console.log(`🚀 [BATCH_EMAIL] User list:`, users.map(u => `${u.name} <${u.email}>`).join(', '));
  
  let successful = 0;
  let failed = 0;
  const errors: string[] = [];
  const startTime = Date.now();

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (!user) {
      console.log(`⚠️  [BATCH_EMAIL] User at index ${i} is undefined, skipping...`);
      continue;
    }
    
    console.log(`📨 [BATCH_EMAIL] Processing user ${i + 1}/${users.length}: ${user.name} <${user.email}>`);
    
    try {
      await sendAnniversaryReminder(
        user.email,
        user.name,
        anniversaryTitle,
        anniversaryDate
      );
      successful++;
      console.log(`✅ [BATCH_EMAIL] Successfully sent to ${user.email} (${successful} of ${users.length})`);
      
      // Add delay to avoid rate limiting in serverless environment
      if (i < users.length - 1) {
        console.log(`⏱️  [BATCH_EMAIL] Waiting before next email...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: unknown) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to send to ${user.email}: ${errorMessage}`);
      console.error(`❌ [BATCH_EMAIL] Failed to send to ${user.email} (${failed} failures so far):`, error);
    }
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`🏁 [BATCH_EMAIL] Batch sending completed for "${anniversaryTitle}"`);
  console.log(`🏁 [BATCH_EMAIL] Results:`);
  console.log(`🏁 [BATCH_EMAIL] - Successful: ${successful}`);
  console.log(`🏁 [BATCH_EMAIL] - Failed: ${failed}`);
  console.log(`🏁 [BATCH_EMAIL] - Total duration: ${duration} seconds`);
  console.log(`🏁 [BATCH_EMAIL] - Average time per email: ${(duration / users.length).toFixed(2)} seconds`);
  
  if (errors.length > 0) {
    console.log(`🏁 [BATCH_EMAIL] Errors:`, errors);
  }

  return { successful, failed, errors };
};

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

    const userList = users.map((user: any) => ({
      email: user.email,
      name: user.name
    }));

    // Check if this is a test request for all reminders
    if (request.body.testAllReminders) {
      console.log(`🧪 [ANNIVERSARY] POST /api/anniversaries/remind - Test all reminders request`);
      console.log(`🧪 [ANNIVERSARY] - Request from user: ${decoded.userId}`);
      console.log(`🧪 [ANNIVERSARY] - This will test send reminders for anniversaries within next 7 days`);

      // Fetch all anniversaries
      const anniversaries: Anniversary[] = await anniversariesCollection
        .find({})
        .toArray();

      console.log(`🧪 [ANNIVERSARY] Found ${anniversaries.length} anniversaries to test`);

      // Track results
      let totalSent = 0;
      let totalFailed = 0;
      const failedAnniversaries: string[] = [];

      // Check each anniversary for upcoming dates (next 7 days)
      for (const anniversary of anniversaries) {
        try {
          console.log(`🧪 [ANNIVERSARY] Checking anniversary: "${anniversary.title}"`);
          
          // Calculate days until anniversary
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Normalize to start of day
          
          const anniversaryDate = new Date(anniversary.date);
          anniversaryDate.setHours(0, 0, 0, 0); // Normalize to start of day
          
          // Calculate the difference in days
          const timeDiff = anniversaryDate.getTime() - today.getTime();
          const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          console.log(`🧪 [ANNIVERSARY] Anniversary "${anniversary.title}" is in ${daysUntil} days`);

          // Test send if the anniversary is within the next 7 days
          if (daysUntil >= 0 && daysUntil <= 7) {
            console.log(`🧪 [ANNIVERSARY] Testing reminder for anniversary: "${anniversary.title}" (in ${daysUntil} days)`);
            
            // Send email reminder to all users
            const result = await sendAnniversaryReminderToAllUsers(
              userList,
              anniversary.title,
              anniversary.date
            );
            
            totalSent += result.successful;
            totalFailed += result.failed;
            
            if (result.failed > 0) {
              failedAnniversaries.push(anniversary.title);
              console.log(`🧪 [ANNIVERSARY] Failed to send some reminders for "${anniversary.title}": ${result.failed} failed`);
            }
            
            console.log(`🧪 [ANNIVERSARY] Completed test sending for "${anniversary.title}": ${result.successful} successful, ${result.failed} failed`);
          } else {
            console.log(`🧪 [ANNIVERSARY] Skipping "${anniversary.title}" (in ${daysUntil} days - outside 0-7 day range)`);
          }
        } catch (anniversaryError: any) {
          console.error(`❌ [ANNIVERSARY] Error processing anniversary "${anniversary.title}" during test:`, anniversaryError.message);
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

      users.forEach((user: any, index) => {
        console.log(`📤 [ANNIVERSARY] - User ${index + 1}: ${user.name} <${user.email}>`);
      });

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
    }
  } catch (error: any) {
    console.error(`❌ [ANNIVERSARY] - Error in sendReminder:`, error);
    console.error(`❌ [ANNIVERSARY] - Error message: ${error.message}`);
    
    return vercelResponse.status(500).json({ message: error.message });
  }
}