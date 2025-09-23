import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  port: number;
  mongoURI: string;
  jwtSecret: string;
  emailjsServiceId: string;
  emailjsTemplateId: string;
  emailjsUserId: string;
}

const config: Config = {
  port: parseInt(process.env.PORT as string, 10) || 3000,
  mongoURI: process.env.MONGODB_URI || 'mongodb+srv://lovestory:6hodo2dvTDjf5WIU@love-story.rwsp47v.mongodb.net/?retryWrites=true&w=majority&appName=Love-Story',
  jwtSecret: process.env.JWT_SECRET || 'love_story_secret_key',
  emailjsServiceId: process.env.EMAILJS_SERVICE_ID || '',
  emailjsTemplateId: process.env.EMAILJS_TEMPLATE_ID || '',
  emailjsUserId: process.env.EMAILJS_USER_ID || '',
};

export default config;