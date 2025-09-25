import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import * as config from '../config';
import { HydratedDocument } from 'mongoose';

interface JwtPayload {
  id: string;
}

// Extend the Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: HydratedDocument<IUser>;
    }
  }
}

const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('🔍 [AUTH] Token received, attempting verification...');

      // Verify token
      const decoded = jwt.verify(token as string, config.default.jwtSecret) as JwtPayload;
      console.log('🔐 [AUTH] Token verified successfully for user ID:', decoded.id);

      // Get user from token
      console.log('👤 [AUTH] Fetching user from database...');
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.log('❌ [AUTH] User not found in database');
        res.status(401).json({ 
          message: 'Not authorized, user not found', 
          tokenValid: true,
          userExists: false 
        });
        return;
      }
      
      req.user = user;
      console.log('✅ [AUTH] User authenticated successfully:', req.user.email);
      next();
    } catch (error: any) {
      console.error('❌ [AUTH] Token verification failed:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress
      });
      
      res.status(401).json({ 
        message: 'Not authorized, token failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
      return;
    }
  } else {
    console.log('🔒 [AUTH] No token provided in request headers');
  }

  if (!token) {
    console.log('🔒 [AUTH] Access denied - no token provided');
    res.status(401).json({ 
      message: 'Not authorized, no token',
      tokenProvided: false 
    });
  }
};

export { protect };