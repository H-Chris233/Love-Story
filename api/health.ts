// Vercel Serverless Function - API Health Check
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../lib/db.js';

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  console.log('🔍 [HEALTH-CHECK] Health check endpoint called');
  
  try {
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Perform a simple database operation to verify connection
    const admin = db.admin();
    const dbInfo = await admin.serverInfo();

    // Return health check response
    return vercelResponse.status(200).json({ 
      status: 'OK', 
      message: 'Love Story API is healthy!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'connected',
        version: dbInfo.version
      }
    });
  } catch (error) {
    console.error('❌ [HEALTH-CHECK] Database connection failed:', error);
    
    return vercelResponse.status(500).json({ 
      status: 'ERROR', 
      message: 'Love Story API is unhealthy!',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
}