// Vercel Serverless Function - API Health Check
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../lib/db.js';
import logger from '../lib/logger.js';

export default async function handler(request: VercelRequest, vercelResponse: VercelResponse) {
  // Handle the case where x-forwarded-for might be a string array
  const forwardedFor = request.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor) 
    ? forwardedFor[0] 
    : typeof forwardedFor === 'string' 
      ? forwardedFor 
      : request.socket?.remoteAddress;

  logger.controller('Health check endpoint called', {
    path: request.url,
    method: request.method,
    timestamp: new Date().toISOString(),
    ip
  });
  
  try {
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Perform a simple database operation to verify connection
    const admin = db.admin();
    const dbInfo = await admin.serverInfo();

    // Return health check response
    logger.controller('Health check completed successfully', {
      databaseVersion: dbInfo.version,
      timestamp: new Date().toISOString()
    });

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
  } catch (error: any) {
    logger.error('Health check failed due to database connection issue', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ip
    });
    
    return vercelResponse.status(500).json({ 
      status: 'ERROR', 
      message: 'Love Story API is unhealthy!',
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}