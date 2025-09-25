import { Request } from 'express';
import { IUser } from '../models/User';

// 扩展Express Request接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}