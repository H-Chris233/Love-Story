// API接口类型定义
export interface User {
  _id: string;
  name: string;
  email: string;
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
  user: string;
  createdAt: string;
}

export interface Anniversary {
  _id: string;
  title: string;
  date: string;
  reminderDays: number;
  user: string;
  createdAt: string;
}

// API响应类型
export interface AuthResponse {
  _id: string;
  name: string;
  email: string;
  token: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}