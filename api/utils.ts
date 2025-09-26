// Utility functions for API handlers
import type { VercelRequest } from '@vercel/node';

/**
 * Extracts the client IP address from the request, handling both string and array formats
 * @param request The Vercel request object
 * @returns The client IP address as a string
 */
export const getClientIP = (request: VercelRequest): string => {
  const forwardedFor = request.headers['x-forwarded-for'];
  return Array.isArray(forwardedFor) 
    ? forwardedFor[0] 
    : typeof forwardedFor === 'string' 
      ? forwardedFor 
      : request.socket?.remoteAddress || 'unknown';
};