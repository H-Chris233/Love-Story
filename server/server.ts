import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database
import connectDB from './config/db';

// Scheduler
import { initializeScheduler } from './utils/scheduler';

// Route files
import authRoutes from './routes/authRoutes';
import memoryRoutes from './routes/memoryRoutes';
import anniversaryRoutes from './routes/anniversaryRoutes';
import imageRoutes from './routes/imageRoutes';

// Create Express app
const app: Application = express();
const PORT: number = parseInt(process.env.PORT as string, 10) || 3000;

console.log(`\n🚀 [SERVER] ==========================================`);
console.log(`🚀 [SERVER] LOVE STORY API SERVER STARTING UP`);
console.log(`🚀 [SERVER] ==========================================`);
console.log(`🚀 [SERVER] Node.js version: ${process.version}`);
console.log(`🚀 [SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🚀 [SERVER] Port: ${PORT}`);
console.log(`🚀 [SERVER] Timestamp: ${new Date().toISOString()}`);
console.log(`🚀 [SERVER] Local time: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);

// Connect to MongoDB
console.log(`🔗 [SERVER] Initializing database connection...`);
connectDB();

// Initialize scheduler
console.log(`⏰ [SERVER] Initializing anniversary reminder scheduler...`);
initializeScheduler();

// Configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://your-app.vercel.app']
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "http://localhost:5173", "http://127.0.0.1:5173"],
    },
  },
})); // Security headers with image loading permissions
app.use(cors(corsOptions)); // Enable CORS with options
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/anniversaries', anniversaryRoutes);
app.use('/api/images', imageRoutes);

// Health check endpoint for Railway
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Love Story API is healthy!' });
});

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Love Story API is running!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ [SERVER] ==========================================`);
  console.log(`✅ [SERVER] LOVE STORY API SERVER SUCCESSFULLY STARTED`);
  console.log(`✅ [SERVER] ==========================================`);
  console.log(`✅ [SERVER] Server is running on port ${PORT}`);
  console.log(`✅ [SERVER] Server URL: http://localhost:${PORT}`);
  console.log(`✅ [SERVER] Health check: http://localhost:${PORT}/health`);
  console.log(`✅ [SERVER] API base: http://localhost:${PORT}/api`);
  console.log(`✅ [SERVER] Ready to accept requests!`);
  console.log(`✅ [SERVER] ==========================================\n`);
});

export default app;