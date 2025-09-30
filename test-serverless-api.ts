#!/usr/bin/env node

/**
 * 无服务器API测试脚本
 * 用于测试 Vercel Serverless Functions 的各种端点
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// 从环境变量中获取API基础URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const PASSWORD = process.env.TEST_PASSWORD || 'password123';
const NAME = process.env.TEST_NAME || 'Test User';

// 存储认证令牌
let authToken: string | null = null;

// 用于存储测试数据的ID
let testUserId: string | null = null;
let testMemoryId: string | null = null;
let testAnniversaryId: string | null = null;

// 生成测试用图片文件
function createTestImage(): Buffer {
  // 创建一个简单的1x1像素的PNG图像
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xA8, 0xA9, 0xA9, 0x01,
    0x00, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x00,
    0x06, 0x47, 0x0A, 0x54, 0x4B, 0x07, 0x78, 0x4F,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82
  ]);
  
  return pngHeader;
}

// 生成随机ID用于测试
function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 通用API请求函数
async function apiRequest<T>(
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  requiresAuth: boolean = false
): Promise<T> {
  try {
    const config: any = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (requiresAuth && authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
    }

    console.log(`\n${method} ${API_BASE_URL}${endpoint}`);
    
    const response = await axios(config);
    
    console.log(`✅ ${method} ${endpoint} - Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error: any) {
    console.error(`❌ ${method} ${endpoint} - Error:`, error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// 测试认证API
async function testAuthAPI() {
  console.log('\n--- 测试认证API ---');
  
  // 1. 测试检查注册是否允许
  console.log('\n1. 检查注册是否允许');
  try {
    await apiRequest('/auth/check-registration', 'GET');
  } catch (error) {
    console.log('检查注册状态失败，继续测试...');
  }
  
  // 2. 测试注册
  console.log('\n2. 注册新用户');
  const randomEmail = `test${Date.now()}@example.com`;
  try {
    const registerResponse = await apiRequest('/auth/register', 'POST', {
      name: NAME,
      email: randomEmail,
      password: PASSWORD
    });
    
    if (registerResponse.token) {
      authToken = registerResponse.token;
      console.log('✅ 认证令牌已获取');
    }
  } catch (error) {
    console.log('注册失败，尝试登录现有用户...');
    
    // 如果注册失败，尝试登录
    try {
      const loginResponse = await apiRequest('/auth/login', 'POST', {
        email: EMAIL,
        password: PASSWORD
      });
      
      if (loginResponse.token) {
        authToken = loginResponse.token;
        console.log('✅ 通过登录获取认证令牌');
      }
    } catch (loginError) {
      console.error('登录也失败了，后续需要认证的测试可能会失败');
    }
  }
  
  // 3. 测试获取用户资料
  if (authToken) {
    console.log('\n3. 获取用户资料');
    try {
      const profile = await apiRequest('/auth/profile', 'GET', undefined, true);
      testUserId = profile.user?._id || profile._id;
    } catch (error) {
      console.error('获取用户资料失败:', error);
    }
  }
}

// 测试回忆API
async function testMemoryAPI() {
  console.log('\n--- 测试回忆API ---');
  
  if (!authToken) {
    console.log('⚠️  跳过回忆API测试（需要认证）');
    return;
  }
  
  // 1. 创建回忆
  console.log('\n1. 创建回忆');
  try {
    const newMemory = await apiRequest('/memories', 'POST', {
      title: '测试回忆',
      description: '这是一个测试回忆',
      date: new Date().toISOString()
    }, true);
    
    if (newMemory._id) {
      testMemoryId = newMemory._id;
    }
  } catch (error) {
    console.error('创建回忆失败:', error);
  }
  
  // 2. 获取所有回忆
  console.log('\n2. 获取所有回忆');
  try {
    await apiRequest('/memories', 'GET', undefined, true);
  } catch (error) {
    console.error('获取回忆列表失败:', error);
  }
  
  // 3. 获取单个回忆
  if (testMemoryId) {
    console.log('\n3. 获取单个回忆');
    try {
      await apiRequest(`/memories/${testMemoryId}`, 'GET', undefined, true);
    } catch (error) {
      console.error('获取单个回忆失败:', error);
    }
  }
  
  // 4. 更新回忆
  if (testMemoryId) {
    console.log('\n4. 更新回忆');
    try {
      await apiRequest(`/memories/${testMemoryId}`, 'PUT', {
        title: '更新的测试回忆',
        description: '这是一个更新的测试回忆',
        date: new Date().toISOString()
      }, true);
    } catch (error) {
      console.error('更新回忆失败:', error);
    }
  }
  
  // 5. 测试图片上传（如果回忆创建成功）
  if (testMemoryId) {
    console.log('\n5. 测试图片上传到回忆');
    try {
      const formData = new FormData();
      const testImage = createTestImage();
      const blob = new Blob([testImage], { type: 'image/png' });
      formData.append('images', blob, 'test-image.png');
      formData.append('title', '带图片的测试回忆');
      formData.append('description', '这是一个带图片的测试回忆');
      formData.append('date', new Date().toISOString());
      
      // 使用 axios 发送 FormData 需要特殊处理
      const config = {
        method: 'PUT',
        url: `${API_BASE_URL}/memories/${testMemoryId}`,
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        data: formData
      };
      
      console.log(`\nPUT ${API_BASE_URL}/memories/${testMemoryId} (with image)`);
      const response = await axios(config);
      console.log(`✅ PUT /memories/${testMemoryId} (with image) - Status: ${response.status}`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      console.error('上传图片失败:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  }
}

// 测试纪念日API
async function testAnniversaryAPI() {
  console.log('\n--- 测试纪念日API ---');
  
  if (!authToken) {
    console.log('⚠️  跳过纪念日API测试（需要认证）');
    return;
  }
  
  // 1. 创建纪念日
  console.log('\n1. 创建纪念日');
  try {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const newAnniversary = await apiRequest('/anniversaries', 'POST', {
      title: '测试纪念日',
      date: nextMonth.toISOString(),
      reminderDays: 7
    }, true);
    
    if (newAnniversary._id) {
      testAnniversaryId = newAnniversary._id;
    }
  } catch (error) {
    console.error('创建纪念日失败:', error);
  }
  
  // 2. 获取所有纪念日
  console.log('\n2. 获取所有纪念日');
  try {
    await apiRequest('/anniversaries', 'GET', undefined, true);
  } catch (error) {
    console.error('获取纪念日列表失败:', error);
  }
  
  // 3. 获取单个纪念日
  if (testAnniversaryId) {
    console.log('\n3. 获取单个纪念日');
    try {
      await apiRequest(`/anniversaries/${testAnniversaryId}`, 'GET', undefined, true);
    } catch (error) {
      console.error('获取单个纪念日失败:', error);
    }
  }
  
  // 4. 更新纪念日
  if (testAnniversaryId) {
    console.log('\n4. 更新纪念日');
    try {
      await apiRequest(`/anniversaries/${testAnniversaryId}`, 'PUT', {
        title: '更新的测试纪念日',
        reminderDays: 3
      }, true);
    } catch (error) {
      console.error('更新纪念日失败:', error);
    }
  }
}

// 测试用户管理API
async function testUserManagementAPI() {
  console.log('\n--- 测试用户管理API ---');
  
  if (!authToken) {
    console.log('⚠️  跳过用户管理API测试（需要认证）');
    return;
  }
  
  // 1. 获取所有用户
  console.log('\n1. 获取所有用户');
  try {
    await apiRequest('/auth/users', 'GET', undefined, true);
  } catch (error) {
    console.error('获取用户列表失败:', error);
  }
}

// 测试健康检查API
async function testHealthAPI() {
  console.log('\n--- 测试健康检查API ---');
  
  try {
    await apiRequest('/health', 'GET');
  } catch (error) {
    console.error('健康检查失败:', error);
  }
}

// 运行所有测试
async function runTests() {
  console.log('🚀 开始测试无服务器API...');

  try {
    // 测试健康检查API
    await testHealthAPI();
    
    // 测试认证API
    await testAuthAPI();
    
    // 测试纪念日API
    await testAnniversaryAPI();
    
    // 测试回忆API
    await testMemoryAPI();
    
    // 测试用户管理API
    await testUserManagementAPI();
    
    console.log('\n✅ 所有API测试完成！');
    
    // 输出测试数据的ID，便于后续调试
    console.log('\n📊 测试数据ID:');
    console.log(`  - User ID: ${testUserId}`);
    console.log(`  - Memory ID: ${testMemoryId}`);
    console.log(`  - Anniversary ID: ${testAnniversaryId}`);
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 检测是否直接运行此脚本
const currentFile = new URL(import.meta.url).pathname.split('/').pop();
if (currentFile === 'test-serverless-api.ts') {
  runTests().catch(console.error);
}

export { apiRequest, testAuthAPI, testMemoryAPI, testAnniversaryAPI, testUserManagementAPI, testHealthAPI, runTests };