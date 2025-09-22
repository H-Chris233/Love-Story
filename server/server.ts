import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database
import connectDB from './config/db';

// Route files
import authRoutes from './routes/authRoutes';
import memoryRoutes from './routes/memoryRoutes';
import anniversaryRoutes from './routes/anniversaryRoutes';
import imageRoutes from './routes/imageRoutes';

// Create Express app
const app: Application = express();
const PORT: number = parseInt(process.env.PORT as string, 10) || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/anniversaries', anniversaryRoutes);
app.use('/api/images', imageRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Love Story API is running!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;