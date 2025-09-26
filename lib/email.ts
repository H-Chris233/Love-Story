// lib/email.ts
// Email utilities for serverless functions
import * as emailjs from 'emailjs';

// Email service configuration
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || '';
const EMAILJS_TODAY_TEMPLATE_ID = process.env.EMAILJS_TODAY_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || '';
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || '';

// Define email sending result type
interface EmailSendingResult {
  successful: number;
  failed: number;
  errors?: Array<{ email: string; error: string }>;
}

// Define user type for email sending
interface UserForEmail {
  email: string;
  name: string;
}

/**
 * Send anniversary reminder to all users
 * @param users - Array of users to send the reminder to
 * @param anniversaryTitle - The title of the anniversary
 * @param anniversaryDate - The date of the anniversary
 * @param isToday - Whether this is a same-day reminder (vs. advance reminder)
 * @returns Result of the email sending operation
 */
export async function sendAnniversaryReminderToAllUsers(
  users: UserForEmail[],
  anniversaryTitle: string,
  anniversaryDate: Date,
  isToday: boolean = false
): Promise<EmailSendingResult> {
  // Validate environment variables
  if (!EMAILJS_SERVICE_ID || !EMAILJS_PUBLIC_KEY) {
    console.error('❌ [EMAIL] Missing required EmailJS environment variables');
    throw new Error('Missing required EmailJS environment variables');
  }

  // Format dates for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const anniversaryDateFormatted = formatDate(anniversaryDate);
  const currentDateFormatted = formatDate(new Date());

  // Determine which template to use
  const templateId = isToday ? EMAILJS_TODAY_TEMPLATE_ID : EMAILJS_TEMPLATE_ID;

  // Prepare template parameters
  const templateParams = {
    anniversary_name: anniversaryTitle,
    anniversary_date_formatted: anniversaryDateFormatted,
    anniversary_weekday: anniversaryDate.toLocaleDateString('zh-CN', { weekday: 'long' }),
    current_date: currentDateFormatted,
    // Only include days_left for advance reminders, not same-day reminders
    ...(isToday ? {} : {
      days_left: Math.ceil(
        (anniversaryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ).toString()
    })
  };

  console.log('📤 [EMAIL] Preparing to send anniversary reminders:', {
    anniversaryTitle,
    anniversaryDate: anniversaryDateFormatted,
    isToday,
    templateId,
    totalUsers: users.length,
    templateParams
  });

  // Initialize EmailJS with public key
  const emailService = emailjs.init(EMAILJS_PUBLIC_KEY);

  let successful = 0;
  let failed = 0;
  const errors: Array<{ email: string; error: string }> = [];

  // Send emails to each user
  for (const user of users) {
    try {
      // Add user-specific parameters
      const userTemplateParams = {
        ...templateParams,
        name: user.name,
        email: user.email
      };

      console.log(`📤 [EMAIL] Sending to: ${user.name} <${user.email}>`);

      // Send the email using private key authentication
      const response = await emailService.send(
        EMAILJS_SERVICE_ID,
        templateId,
        userTemplateParams,
        EMAILJS_PRIVATE_KEY // Using private key for authentication
      );

      console.log(`✅ [EMAIL] Successfully sent to: ${user.name} <${user.email}>`, response);

      successful++;
    } catch (error: any) {
      console.error(`❌ [EMAIL] Failed to send to: ${user.name} <${user.email}>`, error);
      failed++;
      errors.push({
        email: user.email,
        error: error.message || 'Unknown error'
      });
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`📤 [EMAIL] Completed sending anniversary reminders: ${successful} successful, ${failed} failed`);

  return {
    successful,
    failed,
    errors: errors.length > 0 ? errors : undefined
  };
}