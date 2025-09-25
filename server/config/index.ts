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

// Validate required environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'love_story_secret_key') {
  console.error('❌ 错误: JWT_SECRET 环境变量未正确设置');
  console.error('请在 .env 文件中设置一个安全的 JWT_SECRET');
  console.error('示例: JWT_SECRET=your_very_long_and_random_secret_key_here');
  process.exit(1);
}

const config: Config = {
  port: parseInt(process.env.PORT as string, 10) || 3000,
  mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/love-story',
  jwtSecret: process.env.JWT_SECRET,
  emailjsServiceId: process.env.EMAILJS_SERVICE_ID || '',
  emailjsTemplateId: process.env.EMAILJS_TEMPLATE_ID || '',
  emailjsTodayTemplateId: process.env.EMAILJS_TODAY_TEMPLATE_ID || '',
  emailjsPublicKey: process.env.EMAILJS_PUBLIC_KEY || '',
  emailjsPrivateKey: process.env.EMAILJS_PRIVATE_KEY || '',
};

export default config;