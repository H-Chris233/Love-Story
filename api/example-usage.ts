// 示例前端API调用函数
// 这些函数展示了如何在前端调用serverless API

interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

interface Anniversary {
  id: string;
  title: string;
  date: Date;
  reminderDays: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Memory {
  id: string;
  title: string;
  description: string;
  date: Date;
  images: { url: string; publicId: string }[];
  user: string;
  createdAt: Date;
  updatedAt: Date;
}

// 通用API请求函数
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token'); // 假设token存储在localStorage中
  
  const response = await fetch(`${import.meta.env.VITE_SERVERLESS_API_URL || '/api'}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'API request failed');
  }

  return response.json();
}

// 用户认证相关API
export const authAPI = {
  // 用户注册
  register: (userData: { name: string; email: string; password: string }) => 
    apiRequest<{ success: boolean; token: string; user: User }>(`/auth/register`, {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    
  // 用户登录
  login: (credentials: { email: string; password: string }) => 
    apiRequest<{ success: boolean; token: string; user: User }>(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
    
  // 获取用户资料
  getProfile: () => 
    apiRequest<{ success: boolean; user: User }>(`/auth/profile`, {
      method: 'GET'
    })
};

// 纪念日相关API
export const anniversaryAPI = {
  // 获取所有纪念日
  getAll: () => 
    apiRequest<{ success: boolean; anniversaries: Anniversary[] }>(`/anniversaries`, {
      method: 'GET'
    }),
    
  // 创建新纪念日
  create: (anniversaryData: { title: string; date: string; reminderDays: number }) => 
    apiRequest<{ success: boolean; anniversary: Anniversary }>(`/anniversaries/create`, {
      method: 'POST',
      body: JSON.stringify(anniversaryData)
    }),
    
  // 获取特定纪念日
  get: (id: string) => 
    apiRequest<{ success: boolean; anniversary: Anniversary }>(`/anniversaries/${id}`, {
      method: 'GET'
    }),
    
  // 更新纪念日
  update: (id: string, anniversaryData: { title: string; date: string; reminderDays: number }) => 
    apiRequest<{ success: boolean; anniversary: Anniversary }>(`/anniversaries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(anniversaryData)
    }),
    
  // 删除纪念日
  delete: (id: string) => 
    apiRequest<{ success: boolean; message: string }>(`/anniversaries/${id}`, {
      method: 'DELETE'
    }),
    
  // 发送纪念日提醒
  sendReminder: (anniversaryId: string) => 
    apiRequest<{ message: string; details: any }>(`/anniversaries/remind`, {
      method: 'POST',
      body: JSON.stringify({ anniversaryId })
    }),
    
  // 测试发送所有纪念日提醒
  testAllReminders: () => 
    apiRequest<{ message: string; details: any }>(`/anniversaries/test-reminders`, {
      method: 'POST'
    })
};

// 记忆相关API
export const memoryAPI = {
  // 获取所有记忆
  getAll: () => 
    apiRequest<{ success: boolean; memories: Memory[] }>(`/memories`, {
      method: 'GET'
    }),
    
  // 创建新记忆
  create: (memoryData: { title: string; description: string; date: string; images?: any }) => 
    apiRequest<{ success: boolean; memory: Memory }>(`/memories`, {
      method: 'POST',
      body: JSON.stringify(memoryData)
    }),
    
  // 获取特定记忆
  get: (id: string) => 
    apiRequest<{ success: boolean; memory: Memory }>(`/memories/${id}`, {
      method: 'GET'
    }),
    
  // 更新记忆
  update: (id: string, memoryData: { title?: string; description?: string; date?: string }) => 
    apiRequest<{ success: boolean; memory: Memory }>(`/memories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memoryData)
    }),
    
  // 删除记忆
  delete: (id: string) => 
    apiRequest<{ success: boolean; message: string; memoryId: string }>(`/memories/${id}`, {
      method: 'DELETE'
    })
};

// 图片相关API
export const imageAPI = {
  // 上传图片
  upload: (imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return fetch(`${import.meta.env.VITE_SERVERLESS_API_URL || '/api'}/images/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        // 注意：不设置Content-Type，让浏览器自动设置
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  },
  
  // 删除图片
  delete: (publicId: string) => 
    apiRequest<{ message: string; imageId: string }>(`/images/${publicId}`, {
      method: 'DELETE'
    })
};