// API服务封装
import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import type { AuthResponse, User, Memory, Anniversary } from '../types/api';

// 简单的内存缓存实现
interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ApiCache {
  private cache: Map<string, CacheEntry> = new Map();

  get(key: string): unknown {
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

  set(key: string, data: unknown, ttl: number = 5 * 60 * 1000): void { // 默认5分钟
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

// 运行时配置验证
const validateApiConfig = () => {
  const useServerless = import.meta.env.VITE_USE_SERVERLESS_FUNCTIONS === 'true';
  
  if (useServerless) {
    const serverlessUrl = import.meta.env.VITE_SERVERLESS_API_URL;
    if (!serverlessUrl) {
      console.warn('⚠️  [API] Using serverless functions but VITE_SERVERLESS_API_URL is not set. Defaulting to /api');
    } else {
      console.log('✅ [API] Using serverless functions with URL:', serverlessUrl);
    }
  } else {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    console.log('✅ [API] Using traditional server with URL:', apiBaseUrl);
  }
  console.log('🌐 [API] Current mode - Serverless:', useServerless);
};

// 验证配置
validateApiConfig();

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: determineBaseURL(),
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 前端日志控制函数
const shouldLog = (level: 'debug' | 'info' | 'warn' | 'error' = 'info'): boolean => {
  // 在开发模式下，所有级别的日志都显示
  // 在生产模式下，只显示warn和error级别的日志
  if (import.meta.env.DEV) {
    return true;
  }
  
  // 生产模式下只显示warn和error
  const logLevel = import.meta.env.VITE_LOG_LEVEL || 'warn';
  const levels = ['error', 'warn', 'info', 'debug'];
  const minLevelIndex = levels.indexOf(logLevel) || 1; // 默认是warn (index=1)
  const currentLevelIndex = levels.indexOf(level);
  
  return currentLevelIndex >= minLevelIndex;
};

// 请求拦截器
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (shouldLog('info')) {
      console.log('🔍 [API] Request sent:', {
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: config.data instanceof FormData ? 'FormData with ' + Array.from(config.data.entries()).length + ' entries' : config.data
      });
    }
    
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
    if (shouldLog('error')) {
      console.error('❌ [API] Request error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
    
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (shouldLog('info')) {
      console.log('✅ [API] Response received:', {
        status: response.status,
        statusText: response.statusText,
        url: response.config.url,
        method: response.config.method,
        data: response.data
      });
    }
    
    return response;
  },
  (error) => {
    if (shouldLog('error')) {
      console.error('❌ [API] Response error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: error.response?.status,
        data: error.response?.data,
        config: error.config,
        timestamp: new Date().toISOString(),
        url: error.config?.url,
        method: error.config?.method
      });
    }
    
    if (error.response?.status === 401) {
      // 处理未授权错误
      if (shouldLog('info')) {
        console.log('🔒 [API] Unauthorized - clearing token and redirecting to login');
      }
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
          message: error instanceof Error ? error.message : 'Unknown error',
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
          message: error instanceof Error ? error.message : 'Unknown error',
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
          message: error instanceof Error ? error.message : 'Unknown error',
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
          message: error instanceof Error ? error.message : 'Unknown error',
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
          message: error instanceof Error ? error.message : 'Unknown error',
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
          message: error instanceof Error ? error.message : 'Unknown error',
          userId,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
};

// 定义后端响应类型
interface MemoriesResponse {
  success: boolean;
  memories: Memory[];
}

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
    return apiClient.get<MemoriesResponse | Memory[]>('/memories')
      .then(response => {
        // 检查响应格式是哪种架构的格式
        // 传统服务器架构：直接返回数组
        // Serverless架构：返回 { success: true, memories: [] }
        let memories: Memory[];
        if (Array.isArray(response.data)) {
          // 传统服务器架构 - 直接是数组
          memories = response.data;
        } else if ((response.data as MemoriesResponse).memories !== undefined) {
          // Serverless架构 - 有memories字段
          memories = (response.data as MemoriesResponse).memories || [];
        } else {
          // 如果都不是，返回空数组
          memories = [];
        }
        
        console.log(`✅ [API] Fetched ${memories.length} memories`);
        apiCache.set(cacheKey, memories, 5 * 60 * 1000); // 缓存5分钟
        
        // 返回符合预期格式的响应
        return {
          ...response,
          data: memories
        } as AxiosResponse<Memory[]>;
      })
      .catch(error => {
        console.error('❌ [API] Get all memories failed:', {
          message: error instanceof Error ? error.message : 'Unknown error',
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
    // 使用 any type first to handle both possible response formats
    return apiClient.get<any>(`/memories/${id}`)
      .then(response => {
        // Extract memory object - both architectures should return the same format for single memory
        const memory = response.data;
        console.log(`✅ [API] Fetched memory with ID: ${id}`);
        apiCache.set(cacheKey, memory, 10 * 60 * 1000); // 缓存10分钟
        return {
          ...response,
          data: memory
        } as AxiosResponse<Memory>;
      })
      .catch(error => {
        console.error('❌ [API] Get memory by ID failed:', {
          message: error instanceof Error ? error.message : 'Unknown error',
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
          message: error instanceof Error ? error.message : 'Unknown error',
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
          message: error instanceof Error ? error.message : 'Unknown error',
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
          message: error instanceof Error ? error.message : 'Unknown error',
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
          message: error instanceof Error ? error.message : 'Unknown error',
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
          message: error instanceof Error ? error.message : 'Unknown error',
          id,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
};

// 纪念日后端响应类型
interface AnniversariesResponse {
  success: boolean;
  anniversaries: Anniversary[];
}

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
    return apiClient.get<AnniversariesResponse | Anniversary[]>('/anniversaries')
      .then(response => {
        // 检查响应格式是哪种架构的格式
        // 传统服务器架构：直接返回数组
        // Serverless架构：返回 { success: true, anniversaries: [] }
        let anniversaries: Anniversary[];
        if (Array.isArray(response.data)) {
          // 传统服务器架构 - 直接是数组
          anniversaries = response.data;
        } else if ((response.data as AnniversariesResponse).anniversaries !== undefined) {
          // Serverless架构 - 有anniversaries字段
          anniversaries = (response.data as AnniversariesResponse).anniversaries || [];
        } else {
          // 如果都不是，返回空数组
          anniversaries = [];
        }
        
        console.log(`✅ [API] Fetched ${anniversaries.length} anniversaries`);
        apiCache.set(cacheKey, anniversaries, 5 * 60 * 1000); // 缓存5分钟
        
        // 返回符合预期格式的响应
        return {
          ...response,
          data: anniversaries
        } as AxiosResponse<Anniversary[]>;
      })
      .catch(error => {
        console.error('❌ [API] Get all anniversaries failed:', {
          message: error instanceof Error ? error.message : 'Unknown error',
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
    // 使用 any type first to handle both possible response formats
    return apiClient.get<any>(`/anniversaries/${id}`)
      .then(response => {
        // Extract anniversary object - both architectures should return the same format for single anniversary
        const anniversary = response.data;
        console.log(`✅ [API] Fetched anniversary with ID: ${id}`);
        apiCache.set(cacheKey, anniversary, 10 * 60 * 1000); // 缓存10分钟
        return {
          ...response,
          data: anniversary
        } as AxiosResponse<Anniversary>;
      })
      .catch(error => {
        console.error('❌ [API] Get anniversary by ID failed:', {
          message: error instanceof Error ? error.message : 'Unknown error',
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
          message: error instanceof Error ? error.message : 'Unknown error',
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
          message: error instanceof Error ? error.message : 'Unknown error',
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
          message: error instanceof Error ? error.message : 'Unknown error',
          id,
          timestamp: new Date().toISOString()
        });
        throw error;
      });
  },
    
  sendReminder: (id: string): Promise<AxiosResponse<{ message: string; details: unknown }>> => {
    console.log('🎉 [API] Send anniversary reminder request:', id);
    const useServerless = import.meta.env.VITE_USE_SERVERLESS_FUNCTIONS === 'true';
    
    if (useServerless) {
      // 无服务器架构：使用 /anniversaries/remind 并在body中传递anniversaryId
      return apiClient.post<{ message: string; details: unknown }>('/anniversaries/remind', { anniversaryId: id })
        .catch(error => {
          console.error('❌ [API] Send anniversary reminder failed (serverless):', {
            message: error instanceof Error ? error.message : 'Unknown error',
            id,
            timestamp: new Date().toISOString()
          });
          throw error;
        });
    } else {
      // 传统架构：使用 /anniversaries/:id/remind
      return apiClient.post<{ message: string; details: unknown }>(`/anniversaries/${id}/remind`)
        .catch(error => {
          console.error('❌ [API] Send anniversary reminder failed (traditional):', {
            message: error instanceof Error ? error.message : 'Unknown error',
            id,
            timestamp: new Date().toISOString()
          });
          throw error;
        });
    }
  },
    
  testSendAllReminders: (): Promise<AxiosResponse<{ message: string; details?: unknown }>> => {
    console.log('🎉 [API] Test send all anniversary reminders request');
    const useServerless = import.meta.env.VITE_USE_SERVERLESS_FUNCTIONS === 'true';
    
    if (useServerless) {
      // 无服务器架构：使用 /anniversaries/remind 并在body中传递testAllReminders标志
      return apiClient.post<{ message: string; details?: unknown }>('/anniversaries/remind', { testAllReminders: true })
        .catch(error => {
          console.error('❌ [API] Test send all anniversary reminders failed (serverless):', {
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
          throw error;
        });
    } else {
      // 传统架构：使用 /anniversaries/test-reminders
      return apiClient.post<{ message: string; details?: unknown }>('/anniversaries/test-reminders')
        .catch(error => {
          console.error('❌ [API] Test send all anniversary reminders failed (traditional):', {
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
          throw error;
        });
    }
  },
};

// 导出API缓存实例以供手动管理
export { apiCache };