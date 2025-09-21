import emailjs from '@emailjs/browser';
import config from '../config';

// Initialize EmailJS
emailjs.init(config.emailjsUserId);

// Send anniversary reminder email
const sendAnniversaryReminder = async (
  toEmail: string,
  userName: string,
  anniversaryTitle: string,
  anniversaryDate: Date
): Promise<any> => {
  try {
    const templateParams = {
      to_email: toEmail,
      user_name: userName,
      anniversary_title: anniversaryTitle,
      anniversary_date: anniversaryDate,
    };

    const response = await emailjs.send(config.emailjsServiceId, config.emailjsTemplateId, templateParams);
    return response;
  } catch (error) {
    throw new Error('Failed to send email');
  }
};

export { sendAnniversaryReminder };