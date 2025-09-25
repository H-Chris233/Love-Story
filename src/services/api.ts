// API服务封装
import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import type { AuthResponse, User, Memory, Anniversary } from '../types/api';

// 简单的内存缓存实现
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ApiCache {
  private cache: Map<string, CacheEntry> = new Map();

  get(key: string): any {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    // 如果过期则删除
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void { // 默认5分钟
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const apiCache = new ApiCache();

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
    
    // 如果是FormData，删除默认的Content-Type让浏览器自动设置
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
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
    
  checkRegistration: (): Promise<AxiosResponse<{ registrationAllowed: boolean; message: string }>> => 
    apiClient.get<{ registrationAllowed: boolean; message: string }>('/auth/check-registration'),
};

// 记忆相关API
export const memoryAPI = {
  getAll: (): Promise<AxiosResponse<Memory[]>> => {
    // 检查缓存
    const cacheKey = 'memories:all';
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return Promise.resolve({ data: cachedData, status: 200, statusText: 'OK', headers: {}, config: { url: '/memories' } } as AxiosResponse<Memory[]>);
    }
    
    // 如果没有缓存，发起请求并缓存结果
    return apiClient.get<Memory[]>('/memories').then(response => {
      apiCache.set(cacheKey, response.data, 5 * 60 * 1000); // 缓存5分钟
      return response;
    });
  },
    
  getById: (id: string): Promise<AxiosResponse<Memory>> => {
    // 检查缓存
    const cacheKey = `memory:${id}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return Promise.resolve({ data: cachedData, status: 200, statusText: 'OK', headers: {}, config: { url: `/memories/${id}` } } as AxiosResponse<Memory>);
    }
    
    // 如果没有缓存，发起请求并缓存结果
    return apiClient.get<Memory>(`/memories/${id}`).then(response => {
      apiCache.set(cacheKey, response.data, 10 * 60 * 1000); // 缓存10分钟
      return response;
    });
  },
    
  create: (data: Omit<Memory, '_id' | 'createdAt' | 'user' | 'images'> & { images?: Array<{ url: string; publicId: string }> }): Promise<AxiosResponse<Memory>> => {
    // 创建后清除相关缓存
    return apiClient.post<Memory>('/memories', data).then(response => {
      apiCache.delete('memories:all'); // 清除记忆列表缓存
      return response;
    });
  },
    
  createWithImages: (formData: FormData): Promise<AxiosResponse<Memory>> => {
    // 创建后清除相关缓存
    return apiClient.post<Memory>('/memories', formData).then(response => {
      apiCache.delete('memories:all'); // 清除记忆列表缓存
      return response;
    });
  },
    
  update: (id: string, data: Partial<Omit<Memory, '_id' | 'user' | 'createdAt' | 'images'>> & { images?: Array<{ url: string; publicId: string }> }): Promise<AxiosResponse<Memory>> => {
    // 更新后清除相关缓存
    return apiClient.put<Memory>(`/memories/${id}`, data).then(response => {
      apiCache.delete(`memory:${id}`); // 清除单个记忆缓存
      apiCache.delete('memories:all'); // 清除记忆列表缓存
      return response;
    });
  },
    
  updateWithImages: (id: string, formData: FormData): Promise<AxiosResponse<Memory>> => {
    // 更新后清除相关缓存
    return apiClient.put<Memory>(`/memories/${id}`, formData).then(response => {
      apiCache.delete(`memory:${id}`); // 清除单个记忆缓存
      apiCache.delete('memories:all'); // 清除记忆列表缓存
      return response;
    });
  },
    
  delete: (id: string): Promise<AxiosResponse<void>> => {
    // 删除后清除相关缓存
    return apiClient.delete<void>(`/memories/${id}`).then(response => {
      apiCache.delete(`memory:${id}`); // 清除单个记忆缓存
      apiCache.delete('memories:all'); // 清除记忆列表缓存
      return response;
    });
  },
};

// 纪念日相关API
export const anniversaryAPI = {
  getAll: (): Promise<AxiosResponse<Anniversary[]>> => {
    // 检查缓存
    const cacheKey = 'anniversaries:all';
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return Promise.resolve({ data: cachedData, status: 200, statusText: 'OK', headers: {}, config: { url: '/anniversaries' } } as AxiosResponse<Anniversary[]>);
    }
    
    // 如果没有缓存，发起请求并缓存结果
    return apiClient.get<Anniversary[]>('/anniversaries').then(response => {
      apiCache.set(cacheKey, response.data, 5 * 60 * 1000); // 缓存5分钟
      return response;
    });
  },
    
  getById: (id: string): Promise<AxiosResponse<Anniversary>> => {
    // 检查缓存
    const cacheKey = `anniversary:${id}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return Promise.resolve({ data: cachedData, status: 200, statusText: 'OK', headers: {}, config: { url: `/anniversaries/${id}` } } as AxiosResponse<Anniversary>);
    }
    
    // 如果没有缓存，发起请求并缓存结果
    return apiClient.get<Anniversary>(`/anniversaries/${id}`).then(response => {
      apiCache.set(cacheKey, response.data, 10 * 60 * 1000); // 缓存10分钟
      return response;
    });
  },
    
  create: (data: Omit<Anniversary, '_id' | 'createdAt' | 'user'>): Promise<AxiosResponse<Anniversary>> => {
    // 创建后清除相关缓存
    return apiClient.post<Anniversary>('/anniversaries', data).then(response => {
      apiCache.delete('anniversaries:all'); // 清除纪念日列表缓存
      return response;
    });
  },
    
  update: (id: string, data: Partial<Omit<Anniversary, '_id' | 'user' | 'createdAt'>>): Promise<AxiosResponse<Anniversary>> => {
    // 更新后清除相关缓存
    return apiClient.put<Anniversary>(`/anniversaries/${id}`, data).then(response => {
      apiCache.delete(`anniversary:${id}`); // 清除单个纪念日缓存
      apiCache.delete('anniversaries:all'); // 清除纪念日列表缓存
      return response;
    });
  },
    
  delete: (id: string): Promise<AxiosResponse<void>> => {
    // 删除后清除相关缓存
    return apiClient.delete<void>(`/anniversaries/${id}`).then(response => {
      apiCache.delete(`anniversary:${id}`); // 清除单个纪念日缓存
      apiCache.delete('anniversaries:all'); // 清除纪念日列表缓存
      return response;
    });
  },
    
  sendReminder: (id: string): Promise<AxiosResponse<{ message: string; details: any }>> => 
    apiClient.post<{ message: string; details: any }>(`/anniversaries/${id}/remind`),
    
  testSendAllReminders: (): Promise<AxiosResponse<{ message: string; details?: any }>> => 
    apiClient.post<{ message: string; details?: any }>('/anniversaries/test-reminders'),
};

// 导出API缓存实例以供手动管理
export { apiCache };