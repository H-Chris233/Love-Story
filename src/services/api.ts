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
      console.log(`🔍 [CACHE] Cache hit for key: ${key}`);
      return entry.data;
    }
    // 如果过期则删除
    if (entry) {
      console.log(`🗑️ [CACHE] Cache entry expired for key: ${key}`);
      this.cache.delete(key);
    }
    console.log(`❌ [CACHE] Cache miss for key: ${key}`);
    return null;
  }

  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void { // 默认5分钟
    console.log(`💾 [CACHE] Setting cache for key: ${key}, TTL: ${ttl}ms`);
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  delete(key: string): void {
    console.log(`🗑️ [CACHE] Deleting cache for key: ${key}`);
    this.cache.delete(key);
  }

  clear(): void {
    console.log(`🗑️ [CACHE] Clearing all cache entries`);
    this.cache.clear();
  }
}

const apiCache = new ApiCache();

// 动态确定API基础URL
const determineBaseURL = (): string => {
  // 如果使用 Serverless Functions，URL 结构会不同
  const useServerless = import.meta.env.VITE_USE_SERVERLESS_FUNCTIONS === 'true';
  
  if (useServerless) {
    // Vercel Functions 的 URL 模式
    return import.meta.env.VITE_SERVERLESS_API_URL || '/api';
  } else {
    // 当前 Express 服务器的 URL 模式
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  }
};

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: determineBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log('🔍 [API] Request sent:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data instanceof FormData ? 'FormData with ' + Array.from(config.data.entries()).length + ' entries' : config.data
    });
    
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
    console.error('❌ [API] Request error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('✅ [API] Response received:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      method: response.config.method,
      data: response.data
    });
    
    return response;
  },
  (error) => {
    console.error('❌ [API] Response error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: error.config,
      timestamp: new Date().toISOString(),
      url: error.config?.url,
      method: error.config?.method
    });
    
    if (error.response?.status === 401) {
      // 处理未授权错误
      console.log('🔒 [API] Unauthorized - clearing token and redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  register: (data: { name: string; email: string; password: string }): Promise<AxiosResponse<AuthResponse>> => {
    console.log('🔐 [API] Register request:', { email: data.email });
    return apiClient.post<AuthResponse>('/auth/register', data)
      .catch(error => {
        console.error('❌ [API] Register failed:', {
          message: error.message,
          email: data.email,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  login: (data: { email: string; password: string }): Promise<AxiosResponse<AuthResponse>> => {
    console.log('🔐 [API] Login request:', { email: data.email });
    return apiClient.post<AuthResponse>('/auth/login', data)
      .catch(error => {
        console.error('❌ [API] Login failed:', {
          message: error.message,
          email: data.email,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  getProfile: (): Promise<AxiosResponse<User>> => {
    console.log('👤 [API] Get profile request');
    return apiClient.get<User>('/auth/profile')
      .catch(error => {
        console.error('❌ [API] Get profile failed:', {
          message: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  checkRegistration: (): Promise<AxiosResponse<{ registrationAllowed: boolean; message: string }>> => {
    console.log('🔍 [API] Check registration request');
    return apiClient.get<{ registrationAllowed: boolean; message: string }>('/auth/check-registration')
      .catch(error => {
        console.error('❌ [API] Check registration failed:', {
          message: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
  
  getAllUsers: (): Promise<AxiosResponse<User[]>> => {
    console.log('👥 [API] Get all users request');
    return apiClient.get<User[]>('/auth/users')
      .catch(error => {
        console.error('❌ [API] Get all users failed:', {
          message: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
  
  deleteUser: (userId: string): Promise<AxiosResponse<{ message: string; deletedUser: { id: string; name: string; email: string } }>> => {
    console.log('🗑️ [API] Delete user request:', { userId });
    return apiClient.delete<{ message: string; deletedUser: { id: string; name: string; email: string } }>(`/auth/users/${userId}`)
      .catch(error => {
        console.error('❌ [API] Delete user failed:', {
          message: error.message,
          userId,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
};

// 记忆相关API
export const memoryAPI = {
  getAll: (): Promise<AxiosResponse<Memory[]>> => {
    console.log('📚 [API] Get all memories request');
    // 检查缓存
    const cacheKey = 'memories:all';
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return Promise.resolve({ data: cachedData, status: 200, statusText: 'OK', headers: {}, config: { url: '/memories' } } as AxiosResponse<Memory[]>);
    }
    
    // 如果没有缓存，发起请求并缓存结果
    return apiClient.get<Memory[]>('/memories')
      .then(response => {
        console.log(`✅ [API] Fetched ${response.data.length} memories`);
        apiCache.set(cacheKey, response.data, 5 * 60 * 1000); // 缓存5分钟
        return response;
      })
      .catch(error => {
        console.error('❌ [API] Get all memories failed:', {
          message: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  getById: (id: string): Promise<AxiosResponse<Memory>> => {
    console.log('📚 [API] Get memory by ID request:', id);
    // 检查缓存
    const cacheKey = `memory:${id}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return Promise.resolve({ data: cachedData, status: 200, statusText: 'OK', headers: {}, config: { url: `/memories/${id}` } } as AxiosResponse<Memory>);
    }
    
    // 如果没有缓存，发起请求并缓存结果
    return apiClient.get<Memory>(`/memories/${id}`)
      .then(response => {
        console.log(`✅ [API] Fetched memory with ID: ${id}`);
        apiCache.set(cacheKey, response.data, 10 * 60 * 1000); // 缓存10分钟
        return response;
      })
      .catch(error => {
        console.error('❌ [API] Get memory by ID failed:', {
          message: error.message,
          id,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  create: (data: Omit<Memory, '_id' | 'createdAt' | 'user' | 'images'> & { images?: Array<{ url: string; publicId: string }> }): Promise<AxiosResponse<Memory>> => {
    console.log('📚 [API] Create memory request:', { title: data.title, images: data.images?.length });
    // 创建后清除相关缓存
    return apiClient.post<Memory>('/memories', data)
      .then(response => {
        console.log(`✅ [API] Created memory with ID: ${response.data._id}`);
        apiCache.delete('memories:all'); // 清除记忆列表缓存
        return response;
      })
      .catch(error => {
        console.error('❌ [API] Create memory failed:', {
          message: error.message,
          title: data.title,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  createWithImages: (formData: FormData): Promise<AxiosResponse<Memory>> => {
    console.log('📚 [API] Create memory with images request:', { 
      formDataSize: Array.from(formData.entries()).length 
    });
    // 创建后清除相关缓存
    return apiClient.post<Memory>('/memories', formData)
      .then(response => {
        console.log(`✅ [API] Created memory with images, ID: ${response.data._id}`);
        apiCache.delete('memories:all'); // 清除记忆列表缓存
        return response;
      })
      .catch(error => {
        console.error('❌ [API] Create memory with images failed:', {
          message: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  update: (id: string, data: Partial<Omit<Memory, '_id' | 'user' | 'createdAt' | 'images'>> & { images?: Array<{ url: string; publicId: string }> }): Promise<AxiosResponse<Memory>> => {
    console.log('📚 [API] Update memory request:', { id, data });
    // 更新后清除相关缓存
    return apiClient.put<Memory>(`/memories/${id}`, data)
      .then(response => {
        console.log(`✅ [API] Updated memory with ID: ${id}`);
        apiCache.delete(`memory:${id}`); // 清除单个记忆缓存
        apiCache.delete('memories:all'); // 清除记忆列表缓存
        return response;
      })
      .catch(error => {
        console.error('❌ [API] Update memory failed:', {
          message: error.message,
          id,
          data,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  updateWithImages: (id: string, formData: FormData): Promise<AxiosResponse<Memory>> => {
    console.log('📚 [API] Update memory with images request:', { 
      id, 
      formDataSize: Array.from(formData.entries()).length 
    });
    // 更新后清除相关缓存
    return apiClient.put<Memory>(`/memories/${id}`, formData)
      .then(response => {
        console.log(`✅ [API] Updated memory with images, ID: ${id}`);
        apiCache.delete(`memory:${id}`); // 清除单个记忆缓存
        apiCache.delete('memories:all'); // 清除记忆列表缓存
        return response;
      })
      .catch(error => {
        console.error('❌ [API] Update memory with images failed:', {
          message: error.message,
          id,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  delete: (id: string): Promise<AxiosResponse<void>> => {
    console.log('📚 [API] Delete memory request:', id);
    // 删除后清除相关缓存
    return apiClient.delete<void>(`/memories/${id}`)
      .then(response => {
        console.log(`✅ [API] Deleted memory with ID: ${id}`);
        apiCache.delete(`memory:${id}`); // 清除单个记忆缓存
        apiCache.delete('memories:all'); // 清除记忆列表缓存
        return response;
      })
      .catch(error => {
        console.error('❌ [API] Delete memory failed:', {
          message: error.message,
          id,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
};

// 纪念日相关API
export const anniversaryAPI = {
  getAll: (): Promise<AxiosResponse<Anniversary[]>> => {
    console.log('🎉 [API] Get all anniversaries request');
    // 检查缓存
    const cacheKey = 'anniversaries:all';
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return Promise.resolve({ data: cachedData, status: 200, statusText: 'OK', headers: {}, config: { url: '/anniversaries' } } as AxiosResponse<Anniversary[]>);
    }
    
    // 如果没有缓存，发起请求并缓存结果
    return apiClient.get<Anniversary[]>('/anniversaries')
      .then(response => {
        console.log(`✅ [API] Fetched ${response.data.length} anniversaries`);
        apiCache.set(cacheKey, response.data, 5 * 60 * 1000); // 缓存5分钟
        return response;
      })
      .catch(error => {
        console.error('❌ [API] Get all anniversaries failed:', {
          message: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  getById: (id: string): Promise<AxiosResponse<Anniversary>> => {
    console.log('🎉 [API] Get anniversary by ID request:', id);
    // 检查缓存
    const cacheKey = `anniversary:${id}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return Promise.resolve({ data: cachedData, status: 200, statusText: 'OK', headers: {}, config: { url: `/anniversaries/${id}` } } as AxiosResponse<Anniversary>);
    }
    
    // 如果没有缓存，发起请求并缓存结果
    return apiClient.get<Anniversary>(`/anniversaries/${id}`)
      .then(response => {
        console.log(`✅ [API] Fetched anniversary with ID: ${id}`);
        apiCache.set(cacheKey, response.data, 10 * 60 * 1000); // 缓存10分钟
        return response;
      })
      .catch(error => {
        console.error('❌ [API] Get anniversary by ID failed:', {
          message: error.message,
          id,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  create: (data: Omit<Anniversary, '_id' | 'createdAt' | 'user'>): Promise<AxiosResponse<Anniversary>> => {
    console.log('🎉 [API] Create anniversary request:', { title: data.title });
    // 创建后清除相关缓存
    return apiClient.post<Anniversary>('/anniversaries', data)
      .then(response => {
        console.log(`✅ [API] Created anniversary with ID: ${response.data._id}`);
        apiCache.delete('anniversaries:all'); // 清除纪念日列表缓存
        return response;
      })
      .catch(error => {
        console.error('❌ [API] Create anniversary failed:', {
          message: error.message,
          title: data.title,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  update: (id: string, data: Partial<Omit<Anniversary, '_id' | 'user' | 'createdAt'>>): Promise<AxiosResponse<Anniversary>> => {
    console.log('🎉 [API] Update anniversary request:', { id, data });
    // 更新后清除相关缓存
    return apiClient.put<Anniversary>(`/anniversaries/${id}`, data)
      .then(response => {
        console.log(`✅ [API] Updated anniversary with ID: ${id}`);
        apiCache.delete(`anniversary:${id}`); // 清除单个纪念日缓存
        apiCache.delete('anniversaries:all'); // 清除纪念日列表缓存
        return response;
      })
      .catch(error => {
        console.error('❌ [API] Update anniversary failed:', {
          message: error.message,
          id,
          data,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  delete: (id: string): Promise<AxiosResponse<void>> => {
    console.log('🎉 [API] Delete anniversary request:', id);
    // 删除后清除相关缓存
    return apiClient.delete<void>(`/anniversaries/${id}`)
      .then(response => {
        console.log(`✅ [API] Deleted anniversary with ID: ${id}`);
        apiCache.delete(`anniversary:${id}`); // 清除单个纪念日缓存
        apiCache.delete('anniversaries:all'); // 清除纪念日列表缓存
        return response;
      })
      .catch(error => {
        console.error('❌ [API] Delete anniversary failed:', {
          message: error.message,
          id,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  sendReminder: (id: string): Promise<AxiosResponse<{ message: string; details: any }>> => {
    console.log('🎉 [API] Send anniversary reminder request:', id);
    return apiClient.post<{ message: string; details: any }>(`/anniversaries/${id}/remind`)
      .catch(error => {
        console.error('❌ [API] Send anniversary reminder failed:', {
          message: error.message,
          id,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  testSendAllReminders: (): Promise<AxiosResponse<{ message: string; details?: any }>> => {
    console.log('🎉 [API] Test send all anniversary reminders request');
    return apiClient.post<{ message: string; details?: any }>('/anniversaries/test-reminders')
      .catch(error => {
        console.error('❌ [API] Test send all anniversary reminders failed:', {
          message: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
};

// 导出API缓存实例以供手动管理
export { apiCache };