import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  port: number;
  mongoURI: string;
  jwtSecret: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  emailjsServiceId: string;
  emailjsTemplateId: string;
  emailjsUserId: string;
}

const config: Config = {
  port: parseInt(process.env.PORT as string, 10) || 3000,
  mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/love-story',
  jwtSecret: process.env.JWT_SECRET || 'love_story_secret_key',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  emailjsServiceId: process.env.EMAILJS_SERVICE_ID || '',
  emailjsTemplateId: process.env.EMAILJS_TEMPLATE_ID || '',
  emailjsUserId: process.env.EMAILJS_USER_ID || '',
};

export default config;