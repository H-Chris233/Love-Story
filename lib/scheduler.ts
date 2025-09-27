// lib/scheduler.ts
// Scheduling utilities for serverless functions
import { connectToDatabase } from './db';
import { sendAnniversaryReminderToAllUsers } from './email';
import { Db, ObjectId } from 'mongodb';

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

// Define result type for manual reminder check
interface ManualReminderCheckResult {
  success: boolean;
  message: string;
  details?: {
    sent: number;
    failed: number;
    checkedAnniversaries: number;
    totalUsers: number;
  };
}

/**
 * Trigger a manual check for anniversary reminders
 * This function can be called to test the reminder system
 * @returns Result of the manual check
 */
export async function triggerManualReminderCheck(): Promise<ManualReminderCheckResult> {
  console.log(`🧪 [SCHEDULER] Starting manual anniversary reminder check...`);

  try {
    // Connect to database
    const { db } = await connectToDatabase();
    const anniversariesCollection = db.collection('anniversaries');
    const usersCollection = db.collection('users');

    // Get all anniversaries
    const anniversaries = await anniversariesCollection
      .find({})
      .toArray();

    console.log(`🧪 [SCHEDULER] Found ${anniversaries.length} anniversaries to check`);

    // Get all users
    const users = await usersCollection
      .find({}, { projection: { name: 1, email: 1 } })
      .toArray();

    console.log(`🧪 [SCHEDULER] Found ${users.length} users to send reminders to`);

    if (users.length === 0) {
      console.log(`🧪 [SCHEDULER] No users found, skipping reminder process`);
      return {
        success: true,
        message: 'No users found, skipped reminder process',
        details: {
          sent: 0,
          failed: 0,
          checkedAnniversaries: anniversaries.length,
          totalUsers: 0
        }
      };
    }

    // Create user list for email sending
    const userList = users.map(user => ({
      email: user.email,
      name: user.name
    }));

    // Track results
    let totalSent = 0;
    let totalFailed = 0;

    // Check anniversaries for the next 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    for (let i = 0; i <= 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);

      // Find anniversaries happening on this date
      const anniversariesForDate = anniversaries.filter(anniversary => {
        const anniversaryDate = new Date(anniversary.date);
        return (
          anniversaryDate.getDate() === checkDate.getDate() &&
          anniversaryDate.getMonth() === checkDate.getMonth() &&
          anniversaryDate.getFullYear() === checkDate.getFullYear()
        );
      });

      // For each anniversary happening on this date, check if we should send a reminder
      for (const anniversary of anniversariesForDate) {
        // Calculate if it's time for a reminder
        const daysUntil = i; // Days from today until the anniversary

        // Check if daysUntil matches the reminderDays setting
        if (daysUntil === anniversary.reminderDays || daysUntil === 0) {
          console.log(`🧪 [SCHEDULER] Found anniversary for reminder check: "${anniversary.title}" (daysUntil: ${daysUntil}, reminderDays: ${anniversary.reminderDays})`);
          
          // Send email reminder to all users
          const isToday = daysUntil === 0;
          const result = await sendAnniversaryReminderToAllUsers(
            userList,
            anniversary.title,
            anniversary.date,
            isToday
          );
          
          totalSent += result.successful;
          totalFailed += result.failed;
          
          console.log(`🧪 [SCHEDULER] Completed sending reminder for "${anniversary.title}": ${result.successful} successful, ${result.failed} failed`);
        }
      }
    }

    console.log(`🧪 [SCHEDULER] Completed manual reminder check`);
    console.log(`🧪 [SCHEDULER] Summary: ${totalSent} sent, ${totalFailed} failed`);

    return {
      success: true,
      message: 'Manual anniversary reminder check completed',
      details: {
        sent: totalSent,
        failed: totalFailed,
        checkedAnniversaries: anniversaries.length,
        totalUsers: users.length
      }
    };
  } catch (error: any) {
    console.error(`❌ [SCHEDULER] Error in manual reminder check:`, error);
    console.error(`❌ [SCHEDULER] Error message: ${error.message}`);
    
    return {
      success: false,
      message: `Error in manual anniversary reminder check: ${error.message}`
    };
  }
}