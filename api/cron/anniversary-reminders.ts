// api/cron/anniversary-reminders.ts
// Vercel Cron Function to handle anniversary reminders
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../../lib/db';
import { sendAnniversaryReminderToAllUsers } from '../utils/email';

// Calculate days until anniversary
const calculateDaysUntil = (anniversaryDate: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const anniversary = new Date(anniversaryDate);
  anniversary.setHours(0, 0, 0, 0);
  
  const diffTime = anniversary.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  console.log(`📅 [SCHEDULER] Date calculation:`);
  console.log(`📅 [SCHEDULER] - Today: ${today.toISOString().split('T')[0]}`);
  console.log(`📅 [SCHEDULER] - Anniversary: ${anniversary.toISOString().split('T')[0]}`);
  console.log(`📅 [SCHEDULER] - Days until: ${diffDays}`);
  
  return diffDays;
};

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  // Verify this is a cron request
  if (request.headers['user-agent'] !== 'vercel-cron') {
    return vercelResponse.status(403).json({ error: 'Forbidden: This endpoint can only be accessed by Vercel Cron' });
  }

  const startTime = new Date();
  console.log(`
🔔 [SCHEDULER] ==========================================
🔔 [SCHEDULER] DAILY ANNIVERSARY REMINDER CHECK STARTED
🔔 [SCHEDULER] Timestamp: ${startTime.toISOString()}
🔔 [SCHEDULER] Local time: ${startTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
🔔 [SCHEDULER] ==========================================
`);

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    
    console.log(`🔍 [SCHEDULER] Step 1: Fetching all anniversaries from database...`);
    
    // Get all anniversaries
    const anniversariesCollection = db.collection('anniversaries');
    const anniversaries = await anniversariesCollection.find({}).toArray();
    console.log(`🔍 [SCHEDULER] Found ${anniversaries.length} anniversaries in database`);
    
    if (anniversaries.length === 0) {
      console.log(`⚠️  [SCHEDULER] No anniversaries found in database. Ending check.`);
      return vercelResponse.status(200).json({ 
        message: 'No anniversaries to process',
        processed: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    // Log all anniversaries
    anniversaries.forEach((anniversary, index) => {
      console.log(`🔍 [SCHEDULER] Anniversary ${index + 1}: \"${anniversary.title}\"`);
      console.log(`🔍 [SCHEDULER]   - Date: ${new Date(anniversary.date).toISOString().split('T')[0]}`);
      console.log(`🔍 [SCHEDULER]   - Reminder Days: ${anniversary.reminderDays}`);
      console.log(`🔍 [SCHEDULER]   - Created: ${new Date(anniversary.createdAt).toISOString().split('T')[0]}`);
    });
    
    console.log(`
👥 [SCHEDULER] Step 2: Fetching all users from database...`);

    // Get all users
    const usersCollection = db.collection('users');
    const users = await usersCollection.find({}, { projection: { name: 1, email: 1 } }).toArray();
    console.log(`👥 [SCHEDULER] Found ${users.length} users in database`);
    
    if (users.length === 0) {
      console.log(`⚠️  [SCHEDULER] No users found in database. Ending check.`);
      return vercelResponse.status(200).json({ 
        message: 'No users to send reminders to',
        processed: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    // Log all users
    users.forEach((user, index) => {
      console.log(`👥 [SCHEDULER] User ${index + 1}: ${user.name} <${user.email}>`);
    });
    
    const userList = users.map(user => ({
      email: user.email,
      name: user.name
    }));
    
    let totalSent = 0;
    let totalFailed = 0;
    let anniversariesProcessed = 0;
    let anniversariesTriggered = 0;
    
    console.log(`
🎯 [SCHEDULER] Step 3: Checking each anniversary for reminder conditions...`);

    // Check each anniversary
    for (const anniversary of anniversaries) {
      anniversariesProcessed++;
      console.log(`
🎯 [SCHEDULER] Processing anniversary ${anniversariesProcessed}/${anniversaries.length}: \"${anniversary.title}\"`);
      
      const daysUntil = calculateDaysUntil(new Date(anniversary.date));
      
      console.log(`🎯 [SCHEDULER] - Reminder condition: daysUntil (${daysUntil}) === reminderDays (${anniversary.reminderDays})`);
      
      // Send reminder if it matches the reminder days setting
      if (daysUntil === anniversary.reminderDays) {
        anniversariesTriggered++;
        console.log(`🎉 [SCHEDULER] ✅ CONDITION MET! Sending reminders for \"${anniversary.title}\"`);
        console.log(`🎉 [SCHEDULER] - Anniversary is ${daysUntil} days away`);
        console.log(`🎉 [SCHEDULER] - Will send to ${userList.length} users`);
        
        const result = await sendAnniversaryReminderToAllUsers(
          userList,
          anniversary.title,
          new Date(anniversary.date)
        );
        
        totalSent += result.successful;
        totalFailed += result.failed;
        
        if (result.errors.length > 0) {
          console.error(`❌ [SCHEDULER] Email sending errors for \"${anniversary.title}\":`, result.errors);
        }
        
        console.log(`🎉 [SCHEDULER] Results for \"${anniversary.title}\": ${result.successful} sent, ${result.failed} failed`);
      } else {
        console.log(`⏭️  [SCHEDULER] ❌ Condition not met. Skipping \"${anniversary.title}\"`);
      }
    }
    
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log(`
🏁 [SCHEDULER] ==========================================
🏁 [SCHEDULER] DAILY ANNIVERSARY REMINDER CHECK COMPLETED
🏁 [SCHEDULER] ==========================================
🏁 [SCHEDULER] End time: ${endTime.toISOString()}
🏁 [SCHEDULER] Duration: ${duration} seconds
🏁 [SCHEDULER] Anniversaries in database: ${anniversaries.length}
🏁 [SCHEDULER] Anniversaries processed: ${anniversariesProcessed}
🏁 [SCHEDULER] Anniversaries triggered: ${anniversariesTriggered}
🏁 [SCHEDULER] Users in database: ${users.length}
🏁 [SCHEDULER] Total emails sent: ${totalSent}
🏁 [SCHEDULER] Total emails failed: ${totalFailed}
🏁 [SCHEDULER] Success rate: ${totalSent + totalFailed > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1) : 0}%
🏁 [SCHEDULER] ==========================================
`);

    return vercelResponse.status(200).json({ 
      message: 'Anniversary reminder check completed',
      anniversariesProcessed,
      anniversariesTriggered,
      totalSent,
      totalFailed,
      duration,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(`💥 [SCHEDULER] CRITICAL ERROR in anniversary reminder check:`);
    console.error(`💥 [SCHEDULER] Error:`, error);
    if (error instanceof Error) {
      console.error(`💥 [SCHEDULER] Message: ${error.message}`);
      console.error(`💥 [SCHEDULER] Stack: ${error.stack}`);
    }
    console.error(`💥 [SCHEDULER] Check ended with error at: ${new Date().toISOString()}\n`);

    return vercelResponse.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}