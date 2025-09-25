// 简单测试脚本，验证JWT密钥配置
const path = require('path');

// 首先测试没有JWT_SECRET的环境
console.log('测试1: 没有设置JWT_SECRET环境变量');
process.env.JWT_SECRET = undefined;

try {
  // 尝试导入配置 - 这应该会失败并退出进程
  delete require.cache[require.resolve('./config')]; 
  const config = require('./config');
  console.log('错误: 配置加载成功，但应该失败');
} catch (e) {
  console.log('正确: 未设置JWT_SECRET时应用会退出');
}

// 测试使用默认值的环境
console.log('\n测试2: 使用默认JWT密钥值');
process.env.JWT_SECRET = 'love_story_secret_key';

try {
  // 这也会失败，因为默认值被拒绝
  delete require.cache[require.resolve('./config')];
  const config = require('./config');
  console.log('错误: 配置加载成功，但应该失败');
} catch (e) {
  console.log('正确: 使用默认JWT密钥时应用会退出');
}

// 测试正确的密钥
console.log('\n测试3: 设置安全的JWT密钥');
process.env.JWT_SECRET = 'this_is_a_secure_jwt_secret_key_that_should_be_at_least_32_characters_long';

try {
  delete require.cache[require.resolve('./config')];
  const config = require('./config');
  console.log('正确: 使用安全JWT密钥时配置加载成功');
  console.log('JWT密钥长度:', config.default.jwtSecret.length);
} catch (e) {
  console.log('错误: 安全JWT密钥配置失败', e.message);
}