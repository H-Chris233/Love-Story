// lib/email.ts
// Email utilities for serverless functions
import emailjs from '@emailjs/nodejs';
import logger from './logger.js';

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
    logger.error('Missing required EmailJS environment variables', {
      hasServiceId: !!EMAILJS_SERVICE_ID,
      hasPublicKey: !!EMAILJS_PUBLIC_KEY,
      hasPrivateKey: !!EMAILJS_PRIVATE_KEY
    });
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

  logger.email('Starting batch email sending for anniversary', {
    anniversaryTitle,
    totalUsers: users.length,
    emailType: isToday ? 'CELEBRATION' : 'REMINDER',
    templateId,
    anniversaryDate: anniversaryDateFormatted,
    userEmails: users.map(u => u.email)
  });

  logger.debug('Email template parameters prepared', {
    templateParams,
    anniversaryTitle
  });

  let successful = 0;
  let failed = 0;
  const errors: Array<{ email: string; error: string }> = [];

  const startTime = Date.now();

  // Send emails to each user
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (!user) {
      console.log(`⚠️  [BATCH_EMAIL] User at index ${i} is undefined, skipping...`);
      continue;
    }

    logger.email(`Processing user ${i + 1}/${users.length}`, {
      userName: user.name,
      userEmail: user.email,
      anniversaryTitle
    });

    try {
      // Add user-specific parameters
      const userTemplateParams = {
        ...templateParams,
        name: user.name,
        email: user.email
      };

      logger.debug('Sending anniversary email', {
        recipientName: user.name,
        recipientEmail: user.email,
        anniversaryTitle,
        emailType: isToday ? 'CELEBRATION' : 'REMINDER',
        templateId,
        serviceId: EMAILJS_SERVICE_ID,
        hasPublicKey: !!EMAILJS_PUBLIC_KEY,
        hasPrivateKey: !!EMAILJS_PRIVATE_KEY
      });

      // Send the email using @emailjs/nodejs API
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        templateId,
        userTemplateParams,
        {
          publicKey: EMAILJS_PUBLIC_KEY,
          privateKey: EMAILJS_PRIVATE_KEY,
        }
      );

      logger.email('Email sent successfully', {
        recipientEmail: user.email,
        recipientName: user.name,
        anniversaryTitle,
        emailType: isToday ? 'CELEBRATION' : 'REMINDER',
        progress: `${successful + 1} of ${users.length}`,
        responseStatus: response?.status || 'unknown'
      });
      
      logger.debug('EmailJS response details', {
        recipientEmail: user.email,
        response
      });

      successful++;

      // Add delay to avoid rate limiting in serverless environment
      if (i < users.length - 1) {
        logger.debug('Rate limiting delay', {
          waitTimeMs: 1000,
          remainingUsers: users.length - i - 1
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: unknown) {
      logger.error('Failed to send anniversary email', {
        recipientEmail: user.email,
        recipientName: user.name,
        anniversaryTitle,
        emailType: isToday ? 'CELEBRATION' : 'REMINDER',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        failureCount: failed + 1,
        totalUsers: users.length
      });
      
      failed++;
      errors.push({
        email: user.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  logger.email('Batch email sending completed', {
    anniversaryTitle,
    successful,
    failed,
    totalUsers: users.length,
    durationSeconds: duration,
    averageTimePerEmail: (duration / users.length).toFixed(2),
    successRate: `${((successful / users.length) * 100).toFixed(1)}%`
  });
  
  if (errors.length > 0) {
    logger.warn('Some emails failed to send', {
      anniversaryTitle,
      failedCount: failed,
      errors: errors.map(e => ({ email: e.email, error: e.error }))
    });
  }

  console.log(`📤 [EMAIL] Completed sending anniversary reminders: ${successful} successful, ${failed} failed`);

  return {
    successful,
    failed,
    errors: errors.length > 0 ? errors : undefined
  };
}