// API接口类型定义
export interface User {
  _id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface Memory {
  _id: string;
  title: string;
  description: string;
  date: string;
  images: Array<{
    url: string;
    publicId: string;
  }>;
  user: string | User;
  createdAt: string;
}

export interface Anniversary {
  _id: string;
  title: string;
  date: string;
  reminderDays: number;
  createdAt: string;
}

// API响应类型
export interface AuthResponse {
  _id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  token: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

// 错误类型
export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
}

// 文件上传相关类型
export interface UploadedFile {
  originalFilename?: string;
  name: string;
  path: string;
  size: number;
  type: string;
}

export interface UploadFields {
  [key: string]: string | string[];
}

// 数据库查询结果类型
export interface DatabaseResult {
  acknowledged: boolean;
  insertedId?: string;
  modifiedCount?: number;
  deletedCount?: number;
}

// 日志相关类型
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// API错误响应类型
export interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: string[];
      details?: string;
      successful?: number;
      failed?: number;
    };
    status?: number;
  };
  message?: string;
}