// api/cron/send-anniversary-reminders.ts
// Vercel Serverless Function for automatically sending anniversary reminders
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db.js';
import { sendAnniversaryReminderToAllUsers } from '../../lib/email.js';



export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  // Only allow GET requests for this endpoint
  if (request.method !== 'GET') {
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  // Verify authentication - this endpoint should only be called by the scheduler or with proper auth
  // For demo purposes, we'll skip authentication, but in production you'd want to add security
  const authHeader = request.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_AUTH_TOKEN}`) {
    return vercelResponse.status(401).json({
      message: 'Unauthorized: Invalid or missing cron authentication token'
    });
  }

  console.log(`🔔 [CRON] Starting automatic anniversary reminder check...`);

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    const anniversariesCollection = db.collection('anniversaries');
    const usersCollection = db.collection('users');

    // Get all anniversaries
    const anniversaries: Anniversary[] = await anniversariesCollection
      .find({})
      .toArray();

    console.log(`🔔 [CRON] Found ${anniversaries.length} anniversaries to check`);

    // Get all users
    const users: User[] = await usersCollection
      .find({}, { projection: { name: 1, email: 1 } })
      .toArray();

    console.log(`🔔 [CRON] Found ${users.length} users to send reminders to`);

    if (users.length === 0) {
      console.log(`🔔 [CRON] No users found, skipping reminder process`);
      return vercelResponse.status(200).json({
        message: 'No users found, skipped reminder process',
        summary: {
          anniversariesChecked: anniversaries.length,
          usersFound: 0,
          remindersSent: 0
        }
      });
    }

    // Create user list for email sending
    const userList = users.map(user => ({
      email: user.email,
      name: user.name
    }));

    // Track results
    let totalSent = 0;
    let totalFailed = 0;
    const failedAnniversaries: string[] = [];

    // Check each anniversary
    for (const anniversary of anniversaries) {
      try {
        console.log(`🔔 [CRON] Checking anniversary: "${anniversary.title}"`);
        
        // Calculate days until anniversary
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day
        
        const anniversaryDate = new Date(anniversary.date);
        anniversaryDate.setHours(0, 0, 0, 0); // Normalize to start of day
        
        // Calculate the difference in days
        const timeDiff = anniversaryDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        console.log(`🔔 [CRON] Anniversary "${anniversary.title}" is in ${daysUntil} days (reminder set for ${anniversary.reminderDays} days before)`);
        
        // Check if it's time to send the reminder
        if (daysUntil === anniversary.reminderDays || daysUntil === 0) {
          console.log(`🔔 [CRON] Sending reminder for anniversary: "${anniversary.title}"`);
          
          // Send email reminder to all users
          const result = await sendAnniversaryReminderToAllUsers(
            userList,
            anniversary.title,
            anniversary.date,
            daysUntil === 0 // isToday flag for template selection
          );
          
          totalSent += result.successful;
          totalFailed += result.failed;
          
          if (result.failed > 0) {
            failedAnniversaries.push(anniversary.title);
            console.log(`🔔 [CRON] Failed to send some reminders for "${anniversary.title}": ${result.failed} failed`);
          }
          
          console.log(`🔔 [CRON] Completed sending reminder for "${anniversary.title}": ${result.successful} successful, ${result.failed} failed`);
        } else {
          console.log(`🔔 [CRON] Not time to send reminder for "${anniversary.title}" (daysUntil: ${daysUntil}, reminderDays: ${anniversary.reminderDays})`);
        }
      } catch (anniversaryError: unknown) {
        console.error(`❌ [CRON] Error processing anniversary "${anniversary.title}":`, anniversaryError instanceof Error ? anniversaryError.message : 'Unknown error');
        totalFailed++;
        failedAnniversaries.push(anniversary.title);
      }
    }

    console.log(`🔔 [CRON] Completed automatic reminder check`);
    console.log(`🔔 [CRON] Summary: ${totalSent} sent, ${totalFailed} failed`);

    return vercelResponse.status(200).json({
      message: 'Automatic anniversary reminder check completed',
      summary: {
        anniversariesChecked: anniversaries.length,
        usersFound: users.length,
        remindersSent: totalSent,
        remindersFailed: totalFailed,
        failedAnniversaries
      }
    });
  } catch (error: unknown) {
    console.error(`❌ [CRON] Error in automatic reminder check:`, error);
    console.error(`❌ [CRON] Error message:`, error instanceof Error ? error.message : 'Unknown error');
    
    return vercelResponse.status(500).json({ 
      message: 'Error in automatic anniversary reminder check',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
}