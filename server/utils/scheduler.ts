import cron from 'node-cron';
import Anniversary from '../models/Anniversary';
import User from '../models/User';
import { sendAnniversaryReminderToAllUsers } from './email';

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

// Check and send anniversary reminders
const checkAndSendReminders = async (): Promise<void> => {
  const startTime = new Date();
  console.log(`\n🔔 [SCHEDULER] ==========================================`);
  console.log(`🔔 [SCHEDULER] DAILY ANNIVERSARY REMINDER CHECK STARTED`);
  console.log(`🔔 [SCHEDULER] Timestamp: ${startTime.toISOString()}`);
  console.log(`🔔 [SCHEDULER] Local time: ${startTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log(`🔔 [SCHEDULER] ==========================================\n`);
  
  try {
    console.log(`🔍 [SCHEDULER] Step 1: Fetching all anniversaries from database...`);
    
    // Get all anniversaries
    const anniversaries = await Anniversary.find();
    console.log(`🔍 [SCHEDULER] Found ${anniversaries.length} anniversaries in database`);
    
    if (anniversaries.length === 0) {
      console.log(`⚠️  [SCHEDULER] No anniversaries found in database. Ending check.`);
      return;
    }
    
    // Log all anniversaries
    anniversaries.forEach((anniversary, index) => {
      console.log(`🔍 [SCHEDULER] Anniversary ${index + 1}: "${anniversary.title}"`);
      console.log(`🔍 [SCHEDULER]   - Date: ${anniversary.date.toISOString().split('T')[0]}`);
      console.log(`🔍 [SCHEDULER]   - Reminder Days: ${anniversary.reminderDays}`);
      console.log(`🔍 [SCHEDULER]   - Created: ${anniversary.createdAt.toISOString().split('T')[0]}`);
    });
    
    console.log(`\n👥 [SCHEDULER] Step 2: Fetching all users from database...`);
    
    // Get all users
    const users = await User.find({}, 'name email');
    console.log(`👥 [SCHEDULER] Found ${users.length} users in database`);
    
    if (users.length === 0) {
      console.log(`⚠️  [SCHEDULER] No users found in database. Ending check.`);
      return;
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
    
    console.log(`\n🎯 [SCHEDULER] Step 3: Checking each anniversary for reminder conditions...`);
    
    // Check each anniversary
    for (const anniversary of anniversaries) {
      anniversariesProcessed++;
      console.log(`\n🎯 [SCHEDULER] Processing anniversary ${anniversariesProcessed}/${anniversaries.length}: "${anniversary.title}"`);
      
      const daysUntil = calculateDaysUntil(anniversary.date);
      
      console.log(`🎯 [SCHEDULER] - Reminder condition: daysUntil (${daysUntil}) === reminderDays (${anniversary.reminderDays})`);
      
      // Send reminder if it matches the reminder days setting
      if (daysUntil === anniversary.reminderDays) {
        anniversariesTriggered++;
        console.log(`🎉 [SCHEDULER] ✅ CONDITION MET! Sending reminders for "${anniversary.title}"`);
        console.log(`🎉 [SCHEDULER] - Anniversary is ${daysUntil} days away`);
        console.log(`🎉 [SCHEDULER] - Will send to ${userList.length} users`);
        
        const result = await sendAnniversaryReminderToAllUsers(
          userList,
          anniversary.title,
          anniversary.date
        );
        
        totalSent += result.successful;
        totalFailed += result.failed;
        
        if (result.errors.length > 0) {
          console.error(`❌ [SCHEDULER] Email sending errors for "${anniversary.title}":`, result.errors);
        }
        
        console.log(`🎉 [SCHEDULER] Results for "${anniversary.title}": ${result.successful} sent, ${result.failed} failed`);
      } else {
        console.log(`⏭️  [SCHEDULER] ❌ Condition not met. Skipping "${anniversary.title}"`);
      }
    }
    
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log(`\n🏁 [SCHEDULER] ==========================================`);
    console.log(`🏁 [SCHEDULER] DAILY ANNIVERSARY REMINDER CHECK COMPLETED`);
    console.log(`🏁 [SCHEDULER] ==========================================`);
    console.log(`🏁 [SCHEDULER] End time: ${endTime.toISOString()}`);
    console.log(`🏁 [SCHEDULER] Duration: ${duration} seconds`);
    console.log(`🏁 [SCHEDULER] Anniversaries in database: ${anniversaries.length}`);
    console.log(`🏁 [SCHEDULER] Anniversaries processed: ${anniversariesProcessed}`);
    console.log(`🏁 [SCHEDULER] Anniversaries triggered: ${anniversariesTriggered}`);
    console.log(`🏁 [SCHEDULER] Users in database: ${users.length}`);
    console.log(`🏁 [SCHEDULER] Total emails sent: ${totalSent}`);
    console.log(`🏁 [SCHEDULER] Total emails failed: ${totalFailed}`);
    console.log(`🏁 [SCHEDULER] Success rate: ${totalSent + totalFailed > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1) : 0}%`);
    console.log(`🏁 [SCHEDULER] ==========================================\n`);
    
  } catch (error: unknown) {
    console.error(`💥 [SCHEDULER] CRITICAL ERROR in anniversary reminder check:`);
    console.error(`💥 [SCHEDULER] Error:`, error);
    if (error instanceof Error) {
      console.error(`💥 [SCHEDULER] Message: ${error.message}`);
      console.error(`💥 [SCHEDULER] Stack: ${error.stack}`);
    }
    console.error(`💥 [SCHEDULER] Check ended with error at: ${new Date().toISOString()}\n`);
  }
};

// Manual trigger for testing
const triggerManualReminderCheck = async (): Promise<{
  success: boolean;
  message: string;
  details?: { sent: number; failed: number };
}> => {
  const startTime = new Date();
  console.log(`\n🧪 [MANUAL_TEST] ==========================================`);
  console.log(`🧪 [MANUAL_TEST] MANUAL ANNIVERSARY REMINDER TEST STARTED`);
  console.log(`🧪 [MANUAL_TEST] Timestamp: ${startTime.toISOString()}`);
  console.log(`🧪 [MANUAL_TEST] Local time: ${startTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log(`🧪 [MANUAL_TEST] Test range: Anniversaries within next 7 days`);
  console.log(`🧪 [MANUAL_TEST] ==========================================\n`);
  
  try {
    console.log(`🔍 [MANUAL_TEST] Step 1: Fetching data from database...`);
    
    const anniversaries = await Anniversary.find();
    const users = await User.find({}, 'name email');
    
    console.log(`🔍 [MANUAL_TEST] Found ${anniversaries.length} anniversaries in database`);
    console.log(`🔍 [MANUAL_TEST] Found ${users.length} users in database`);
    
    if (users.length === 0) {
      console.log(`❌ [MANUAL_TEST] No users found in the system`);
      return {
        success: false,
        message: 'No users found in the system'
      };
    }
    
    if (anniversaries.length === 0) {
      console.log(`❌ [MANUAL_TEST] No anniversaries found in the system`);
      return {
        success: false,
        message: 'No anniversaries found in the system'
      };
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
    
    console.log(`\n🎯 [MANUAL_TEST] Step 2: Checking anniversaries within 7 days...`);
    
    // For manual trigger, send reminders for anniversaries within the next 7 days
    for (let i = 0; i < anniversaries.length; i++) {
      const anniversary = anniversaries[i];
      if (!anniversary) {
        console.log(`⚠️  [MANUAL_TEST] Anniversary at index ${i} is undefined, skipping...`);
        continue;
      }
      
      console.log(`\n🎯 [MANUAL_TEST] Checking anniversary ${i + 1}/${anniversaries.length}: "${anniversary.title}"`);
      
      const daysUntil = calculateDaysUntil(anniversary.date);
      
      console.log(`🎯 [MANUAL_TEST] - Days until anniversary: ${daysUntil}`);
      console.log(`🎯 [MANUAL_TEST] - Test condition: 0 <= ${daysUntil} <= 7`);
      
      if (daysUntil >= 0 && daysUntil <= 7) {
        anniversariesInRange++;
        anniversariesTriggered++;
        console.log(`🎉 [MANUAL_TEST] ✅ Anniversary "${anniversary.title}" is within range!`);
        console.log(`🎉 [MANUAL_TEST] - Will send test emails to ${userList.length} users`);
        
        const result = await sendAnniversaryReminderToAllUsers(
          userList,
          anniversary.title,
          anniversary.date
        );
        
        totalSent += result.successful;
        totalFailed += result.failed;
        
        console.log(`🎉 [MANUAL_TEST] Results for "${anniversary.title}": ${result.successful} sent, ${result.failed} failed`);
      } else {
        console.log(`⏭️  [MANUAL_TEST] ❌ Anniversary "${anniversary.title}" is outside test range (${daysUntil} days)`);
      }
    }
    
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log(`\n🏁 [MANUAL_TEST] ==========================================`);
    console.log(`🏁 [MANUAL_TEST] MANUAL ANNIVERSARY REMINDER TEST COMPLETED`);
    console.log(`🏁 [MANUAL_TEST] ==========================================`);
    console.log(`🏁 [MANUAL_TEST] End time: ${endTime.toISOString()}`);
    console.log(`🏁 [MANUAL_TEST] Duration: ${duration} seconds`);
    console.log(`🏁 [MANUAL_TEST] Total anniversaries: ${anniversaries.length}`);
    console.log(`🏁 [MANUAL_TEST] Anniversaries in range (0-7 days): ${anniversariesInRange}`);
    console.log(`🏁 [MANUAL_TEST] Anniversaries triggered: ${anniversariesTriggered}`);
    console.log(`🏁 [MANUAL_TEST] Total users: ${users.length}`);
    console.log(`🏁 [MANUAL_TEST] Total emails sent: ${totalSent}`);
    console.log(`🏁 [MANUAL_TEST] Total emails failed: ${totalFailed}`);
    console.log(`🏁 [MANUAL_TEST] Success rate: ${totalSent + totalFailed > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1) : 0}%`);
    console.log(`🏁 [MANUAL_TEST] ==========================================\n`);
    
    return {
      success: true,
      message: `Manual reminder check completed successfully`,
      details: { sent: totalSent, failed: totalFailed }
    };
    
  } catch (error: unknown) {
    console.error(`💥 [MANUAL_TEST] CRITICAL ERROR in manual reminder check:`);
    console.error(`💥 [MANUAL_TEST] Error:`, error);
    if (error instanceof Error) {
      console.error(`💥 [MANUAL_TEST] Message: ${error.message}`);
      console.error(`💥 [MANUAL_TEST] Stack: ${error.stack}`);
    }
    console.error(`💥 [MANUAL_TEST] Test ended with error at: ${new Date().toISOString()}\n`);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Initialize scheduler
const initializeScheduler = (): void => {
  console.log(`\n⚙️  [SCHEDULER_INIT] ==========================================`);
  console.log(`⚙️  [SCHEDULER_INIT] INITIALIZING ANNIVERSARY REMINDER SCHEDULER`);
  console.log(`⚙️  [SCHEDULER_INIT] ==========================================`);
  
  try {
    // Schedule daily check at 7:00 AM
    cron.schedule('0 7 * * *', checkAndSendReminders, {
      timezone: 'Asia/Shanghai'
    });
    
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(7, 0, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    console.log(`✅ [SCHEDULER_INIT] Scheduler successfully initialized!`);
    console.log(`✅ [SCHEDULER_INIT] Schedule: Daily at 7:00 AM (Asia/Shanghai timezone)`);
    console.log(`✅ [SCHEDULER_INIT] Cron expression: '0 7 * * *'`);
    console.log(`✅ [SCHEDULER_INIT] Current server time: ${now.toISOString()}`);
    console.log(`✅ [SCHEDULER_INIT] Current Shanghai time: ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    console.log(`✅ [SCHEDULER_INIT] Next scheduled run: ${nextRun.toISOString()}`);
    console.log(`✅ [SCHEDULER_INIT] Next Shanghai run: ${nextRun.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    console.log(`⚙️  [SCHEDULER_INIT] ==========================================\n`);
    
  } catch (error: unknown) {
    console.error(`❌ [SCHEDULER_INIT] Failed to initialize scheduler:`, error);
    if (error instanceof Error) {
      console.error(`❌ [SCHEDULER_INIT] Error message: ${error.message}`);
      console.error(`❌ [SCHEDULER_INIT] Error stack: ${error.stack}`);
    }
    console.error(`⚙️  [SCHEDULER_INIT] ==========================================\n`);
  }
};

export { initializeScheduler, checkAndSendReminders, triggerManualReminderCheck };