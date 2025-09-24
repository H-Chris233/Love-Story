import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  port: number;
  mongoURI: string;
  jwtSecret: string;
  emailjsServiceId: string;
  emailjsTemplateId: string;
  emailjsTodayTemplateId: string;
  emailjsPublicKey: string;
  emailjsPrivateKey: string;
}

const config: Config = {
  port: parseInt(process.env.PORT as string, 10) || 3000,
  mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/love-story',
  jwtSecret: process.env.JWT_SECRET || 'love_story_secret_key',
  emailjsServiceId: process.env.EMAILJS_SERVICE_ID || '',
  emailjsTemplateId: process.env.EMAILJS_TEMPLATE_ID || '',
  emailjsTodayTemplateId: process.env.EMAILJS_TODAY_TEMPLATE_ID || '',
  emailjsPublicKey: process.env.EMAILJS_PUBLIC_KEY || '',
  emailjsPrivateKey: process.env.EMAILJS_PRIVATE_KEY || '',
};

export default config;