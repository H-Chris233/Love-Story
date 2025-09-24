import emailjs from '@emailjs/nodejs';
import config from '../config';

console.log(`📧 [EMAIL_INIT] ==========================================`);
console.log(`📧 [EMAIL_INIT] INITIALIZING EMAILJS NODE.JS SERVICE`);
console.log(`📧 [EMAIL_INIT] ==========================================`);
console.log(`📧 [EMAIL_INIT] Checking EmailJS configuration...`);
console.log(`📧 [EMAIL_INIT] - Service ID: ${config.emailjsServiceId ? '✅ Set' : '❌ Not set'}`);
console.log(`📧 [EMAIL_INIT] - Reminder Template ID: ${config.emailjsTemplateId ? '✅ Set' : '❌ Not set'}`);
console.log(`📧 [EMAIL_INIT] - Today Template ID: ${config.emailjsTodayTemplateId ? '✅ Set' : '❌ Not set'}`);
console.log(`📧 [EMAIL_INIT] - Public Key: ${config.emailjsPublicKey ? '✅ Set' : '❌ Not set'}`);
console.log(`📧 [EMAIL_INIT] - Private Key: ${config.emailjsPrivateKey ? '✅ Set' : '❌ Not set'}`);
console.log(`✅ [EMAIL_INIT] EmailJS Node.js service initialized (no client-side init required)`);
console.log(`📧 [EMAIL_INIT] ==========================================\n`);

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
      templateId = config.emailjsTodayTemplateId;
      emailType = 'CELEBRATION';
      templateParams = baseParams; // No days_left parameter for celebration
      console.log(`🎉 [EMAIL] - Today is the anniversary! Using celebration template`);
    } else {
      // Future anniversary - use reminder template  
      templateId = config.emailjsTemplateId;
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
    console.log(`📧 [EMAIL]   - Service ID: ${config.emailjsServiceId}`);
    console.log(`📧 [EMAIL]   - Template ID: ${templateId}`);
    console.log(`📧 [EMAIL]   - Public Key: ${config.emailjsPublicKey ? 'Set' : 'Not set'}`);
    console.log(`📧 [EMAIL]   - Private Key: ${config.emailjsPrivateKey ? 'Set' : 'Not set'}`);

    console.log(`📧 [EMAIL] - Sending ${emailType} email via EmailJS Node.js...`);
    const response = await emailjs.send(
      config.emailjsServiceId, 
      templateId, 
      templateParams,
      {
        publicKey: config.emailjsPublicKey,
        privateKey: config.emailjsPrivateKey,
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
      
      // Add delay to avoid rate limiting
      if (i < users.length - 1) {
        console.log(`⏱️  [BATCH_EMAIL] Waiting 1 second before next email...`);
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

export { sendAnniversaryReminder, sendAnniversaryReminderToAllUsers };