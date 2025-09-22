// API服务封装
import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import type { AuthResponse, User, Memory, Anniversary } from '../types/api';

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 添加认证token
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 处理未授权错误
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  register: (data: { name: string; email: string; password: string }): Promise<AxiosResponse<AuthResponse>> => 
    apiClient.post<AuthResponse>('/auth/register', data),
    
  login: (data: { email: string; password: string }): Promise<AxiosResponse<AuthResponse>> => 
    apiClient.post<AuthResponse>('/auth/login', data),
    
  getProfile: (): Promise<AxiosResponse<User>> => 
    apiClient.get<User>('/auth/profile'),
};

// 记忆相关API
export const memoryAPI = {
  getAll: (): Promise<AxiosResponse<Memory[]>> => 
    apiClient.get<Memory[]>('/memories'),
    
  getById: (id: string): Promise<AxiosResponse<Memory>> => 
    apiClient.get<Memory>(`/memories/${id}`),
    
  create: (data: Omit<Memory, '_id' | 'createdAt' | 'user' | 'images'> & { images?: Array<{ url: string; publicId: string }> }): Promise<AxiosResponse<Memory>> => 
    apiClient.post<Memory>('/memories', data),
    
  createWithImages: (formData: FormData): Promise<AxiosResponse<Memory>> => 
    apiClient.post<Memory>('/memories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
    
  update: (id: string, data: Partial<Omit<Memory, '_id' | 'user' | 'createdAt' | 'images'>> & { images?: Array<{ url: string; publicId: string }> }): Promise<AxiosResponse<Memory>> => 
    apiClient.put<Memory>(`/memories/${id}`, data),
    
  updateWithImages: (id: string, formData: FormData): Promise<AxiosResponse<Memory>> => 
    apiClient.put<Memory>(`/memories/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
    
  delete: (id: string): Promise<AxiosResponse<void>> => 
    apiClient.delete<void>(`/memories/${id}`),
};

// 纪念日相关API
export const anniversaryAPI = {
  getAll: (): Promise<AxiosResponse<Anniversary[]>> => 
    apiClient.get<Anniversary[]>('/anniversaries'),
    
  getById: (id: string): Promise<AxiosResponse<Anniversary>> => 
    apiClient.get<Anniversary>(`/anniversaries/${id}`),
    
  create: (data: Omit<Anniversary, '_id' | 'createdAt' | 'user'>): Promise<AxiosResponse<Anniversary>> => 
    apiClient.post<Anniversary>('/anniversaries', data),
    
  update: (id: string, data: Partial<Omit<Anniversary, '_id' | 'user' | 'createdAt'>>): Promise<AxiosResponse<Anniversary>> => 
    apiClient.put<Anniversary>(`/anniversaries/${id}`, data),
    
  delete: (id: string): Promise<AxiosResponse<void>> => 
    apiClient.delete<void>(`/anniversaries/${id}`),
    
  sendReminder: (id: string): Promise<AxiosResponse<{ message: string }>> => 
    apiClient.post<{ message: string }>(`/anniversaries/${id}/remind`),
};