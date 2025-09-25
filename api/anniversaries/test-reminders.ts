// api/anniversaries/test-reminders.ts
// Vercel Serverless Function for testing anniversary reminders
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
  
  return diffDays;
};

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return vercelResponse.status(405).json({ 
      message: 'Method not allowed' 
    });
  }

  const startTime = new Date();
  console.log(`
🧪 [MANUAL_TEST] ==========================================
🧪 [MANUAL_TEST] MANUAL ANNIVERSARY REMINDER TEST STARTED
🧪 [MANUAL_TEST] Timestamp: ${startTime.toISOString()}
🧪 [MANUAL_TEST] Local time: ${startTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
🧪 [MANUAL_TEST] Test range: Anniversaries within next 7 days
🧪 [MANUAL_TEST] ==========================================
`);

  try {
    // Connect to database
    const { db } = await connectToDatabase();

    console.log(`🔍 [MANUAL_TEST] Step 1: Fetching data from database...`);
    
    const anniversariesCollection = db.collection('anniversaries');
    const anniversaries = await anniversariesCollection.find({}).toArray();
    
    const usersCollection = db.collection('users');
    const users = await usersCollection.find({}, { projection: { name: 1, email: 1 } }).toArray();
    
    console.log(`🔍 [MANUAL_TEST] Found ${anniversaries.length} anniversaries in database`);
    console.log(`🔍 [MANUAL_TEST] Found ${users.length} users in database`);
    
    if (users.length === 0) {
      console.log(`❌ [MANUAL_TEST] No users found in the system`);
      return vercelResponse.status(404).json({
        success: false,
        message: 'No users found in the system'
      });
    }
    
    if (anniversaries.length === 0) {
      console.log(`❌ [MANUAL_TEST] No anniversaries found in the system`);
      return vercelResponse.status(404).json({
        success: false,
        message: 'No anniversaries found in the system'
      });
    }
    
    // Log all users
    users.forEach((user, index) => {
      console.log(`👥 [MANUAL_TEST] User ${index + 1}: ${user.name} <${user.email}>`);
    });
    
    const userList = users.map(user => ({
      email: user.email,
      name: user.name
    }));
    
    let totalSent = 0;
    let totalFailed = 0;
    let anniversariesInRange = 0;
    let anniversariesTriggered = 0;
    
    console.log(`
🎯 [MANUAL_TEST] Step 2: Checking anniversaries within 7 days...`);
    
    // For manual trigger, send reminders for anniversaries within the next 7 days
    for (let i = 0; i < anniversaries.length; i++) {
      const anniversary = anniversaries[i];
      if (!anniversary) {
        console.log(`⚠️  [MANUAL_TEST] Anniversary at index ${i} is undefined, skipping...`);
        continue;
      }
      
      console.log(`
🎯 [MANUAL_TEST] Checking anniversary ${i + 1}/${anniversaries.length}: \"${anniversary.title}\"`);
      
      const daysUntil = calculateDaysUntil(new Date(anniversary.date));
      
      console.log(`🎯 [MANUAL_TEST] - Days until anniversary: ${daysUntil}`);
      console.log(`🎯 [MANUAL_TEST] - Test condition: 0 <= ${daysUntil} <= 7`);
      
      if (daysUntil >= 0 && daysUntil <= 7) {
        anniversariesInRange++;
        anniversariesTriggered++;
        console.log(`🎉 [MANUAL_TEST] ✅ Anniversary \"${anniversary.title}\" is within range!`);
        console.log(`🎉 [MANUAL_TEST] - Will send test emails to ${userList.length} users`);
        
        const result = await sendAnniversaryReminderToAllUsers(
          userList,
          anniversary.title,
          new Date(anniversary.date)
        );
        
        totalSent += result.successful;
        totalFailed += result.failed;
        
        console.log(`🎉 [MANUAL_TEST] Results for \"${anniversary.title}\": ${result.successful} sent, ${result.failed} failed`);
      } else {
        console.log(`⏭️  [MANUAL_TEST] ❌ Anniversary \"${anniversary.title}\" is outside test range (${daysUntil} days)`);
      }
    }
    
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log(`
🏁 [MANUAL_TEST] ==========================================
🏁 [MANUAL_TEST] MANUAL ANNIVERSARY REMINDER TEST COMPLETED
🏁 [MANUAL_TEST] ==========================================
🏁 [MANUAL_TEST] End time: ${endTime.toISOString()}
🏁 [MANUAL_TEST] Duration: ${duration} seconds
🏁 [MANUAL_TEST] Total anniversaries: ${anniversaries.length}
🏁 [MANUAL_TEST] Anniversaries in range (0-7 days): ${anniversariesInRange}
🏁 [MANUAL_TEST] Anniversaries triggered: ${anniversariesTriggered}
🏁 [MANUAL_TEST] Total users: ${users.length}
🏁 [MANUAL_TEST] Total emails sent: ${totalSent}
🏁 [MANUAL_TEST] Total emails failed: ${totalFailed}
🏁 [MANUAL_TEST] Success rate: ${totalSent + totalFailed > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1) : 0}%
🏁 [MANUAL_TEST] ==========================================
`);
    
    return vercelResponse.status(200).json({
      success: true,
      message: `Manual reminder check completed successfully`,
      details: { 
        sent: totalSent, 
        failed: totalFailed 
      },
      summary: {
        totalAnniversaries: anniversaries.length,
        anniversariesInRange,
        anniversariesTriggered,
        totalUsers: users.length,
        durationInSeconds: duration
      }
    });
    
  } catch (error: unknown) {
    console.error(`💥 [MANUAL_TEST] CRITICAL ERROR in manual reminder check:`);
    console.error(`💥 [MANUAL_TEST] Error:`, error);
    if (error instanceof Error) {
      console.error(`💥 [MANUAL_TEST] Message: ${error.message}`);
      console.error(`💥 [MANUAL_TEST] Stack: ${error.stack}`);
    }
    console.error(`💥 [MANUAL_TEST] Test ended with error at: ${new Date().toISOString()}\n`);
    
    return vercelResponse.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
}