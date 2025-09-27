import NodeCache from 'node-cache';

// 创建一个全局缓存实例
const cache = new NodeCache({ 
  stdTTL: 600, // 默认10分钟过期
  checkperiod: 120 // 每2分钟检查过期
});

// 缓存键前缀
const CACHE_PREFIX = {
  MEMORY: 'memory',
  ANNIVERSARY: 'anniversary',
  USER: 'user'
};

/**
 * 生成缓存键
 * @param prefix - 缓存键前缀
 * @param id - 资源ID
 * @param suffix - 可选后缀
 */
const generateCacheKey = (prefix: string, id: string, suffix?: string): string => {
  let key = `${prefix}:${id}`;
  if (suffix) {
    key += `:${suffix}`;
  }
  return key;
};

/**
 * 缓存 API 响应
 * @param key - 缓存键
 * @param data - 要缓存的数据
 * @param ttl - 过期时间（秒）
 */
const setCache = <T>(key: string, data: T, ttl?: number): boolean => {
  try {
    if (ttl !== undefined) {
      return cache.set(key, data, ttl);
    } else {
      return cache.set(key, data);
    }
  } catch (error: unknown) {
    console.error('缓存设置失败:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};

/**
 * 获取缓存数据
 * @param key - 缓存键
 */
const getCache = <T>(key: string): T | undefined => {
  try {
    return cache.get(key);
  } catch (error: unknown) {
    console.error('缓存获取失败:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
};

/**
 * 删除缓存数据
 * @param key - 缓存键
 */
const delCache = (key: string): boolean => {
  try {
    const result = cache.del(key);
    // NodeCache.del() 返回删除的键数量，我们需要返回boolean
    return typeof result === 'number' ? result > 0 : result;
  } catch (error: unknown) {
    console.error('缓存删除失败:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};

/**
 * 清除特定类型的缓存
 * @param prefix - 缓存键前缀
 */
const clearCacheByPrefix = (prefix: string): number => {
  try {
    const keys = cache.keys().filter(key => key.startsWith(prefix));
    return cache.del(keys) as number; // 返回删除的键数量
  } catch (error: unknown) {
    console.error('按前缀清除缓存失败:', error instanceof Error ? error.message : 'Unknown error');
    return 0;
  }
};

export {
  cache,
  CACHE_PREFIX,
  generateCacheKey,
  setCache,
  getCache,
  delCache,
  clearCacheByPrefix
};