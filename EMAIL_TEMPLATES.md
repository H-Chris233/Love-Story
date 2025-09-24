# EmailJS 双模板系统配置指南

本系统使用两个不同的EmailJS模板来处理不同的纪念日邮件场景。

## 📧 模板配置概览

### 1. 提前提醒模板 (EMAILJS_TEMPLATE_ID)
**环境变量**: `EMAILJS_TEMPLATE_ID=template_7fbyeea`
**触发条件**: `daysLeft > 0` 且 `daysLeft <= reminderDays`
**用途**: 提前几天提醒即将到来的纪念日

### 2. 当天庆祝模板 (EMAILJS_TODAY_TEMPLATE_ID)  
**环境变量**: `EMAILJS_TODAY_TEMPLATE_ID=template_jhsg47y`
**触发条件**: `daysLeft === 0`（今天就是纪念日）
**用途**: 当天发送庆祝邮件

## 🎯 模板参数对比

### 提前提醒模板参数
```javascript
{
  "anniversary_name": "第一次约会",
  "days_left": "3",  // ⭐ 包含剩余天数
  "anniversary_date_formatted": "2025年9月24日",
  "anniversary_weekday": "星期三",
  "current_date": "2025年9月21日",
  "name": "Chris233",
  "email": "h-chris233@outlook.com"
}
```

### 当天庆祝模板参数
```javascript
{
  "anniversary_name": "第一次约会",
  // 🚫 不包含 days_left 参数
  "anniversary_date_formatted": "2025年9月24日",
  "anniversary_weekday": "星期三", 
  "current_date": "2025年9月24日",
  "name": "Chris233",
  "email": "h-chris233@outlook.com"
}
```

## 📝 推荐模板内容

### 提前提醒模板
**主题**: 
```
🔔 还有{{days_left}}天就是{{anniversary_name}}了！
```

**正文**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Arial', sans-serif; background: #fff9fb; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; box-shadow: 0 5px 20px rgba(255,107,157,0.2); }
    .header { text-align: center; margin-bottom: 25px; }
    h1 { color: #ff6b9d; font-size: 28px; margin: 15px 0; }
    .countdown { font-size: 48px; margin: 10px 0; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .message { line-height: 1.6; color: #555; font-size: 16px; text-align: center; }
    .highlight { background: #fff0f5; padding: 12px; border-radius: 10px; margin: 20px 0; font-weight: bold; color: #e75480; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="countdown">⏰</div>
      <h1>纪念日提醒</h1>
    </div>
    
    <div class="message">
      <p>亲爱的 {{name}}，</p>
      
      <div class="highlight">
        还有 <strong>{{days_left}} 天</strong> 就是你们的 <strong>{{anniversary_name}}</strong> 了！
      </div>

      <p>📅 纪念日期：{{anniversary_date_formatted}}（{{anniversary_weekday}}）</p>
      
      <p>时间过得真快呢～记得提前准备一个小惊喜哦 🎁</p>
      <p>💡 建议：预订餐厅、准备礼物、规划约会路线...</p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; color: #999; font-size: 14px;">
      来自你们的爱情纪念日提醒系统 💕<br>
      {{current_date}}
    </div>
  </div>
</body>
</html>
```

### 当天庆祝模板
**主题**:
```
💖 今天是{{anniversary_name}}！纪念日快乐！
```

**正文**:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Arial', sans-serif; background: #fff9fb; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; box-shadow: 0 5px 20px rgba(255,107,157,0.2); }
    .header { text-align: center; margin-bottom: 25px; }
    h1 { color: #ff6b9d; font-size: 28px; margin: 15px 0; }
    .celebrate { font-size: 48px; margin: 10px 0; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .message { line-height: 1.6; color: #555; font-size: 16px; text-align: center; }
    .date { background: #fff0f5; padding: 12px; border-radius: 10px; margin: 20px 0; font-weight: bold; color: #e75480; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="celebrate">🎉</div>
      <h1>纪念日快乐！</h1>
    </div>
    
    <div class="message">
      <p>亲爱的 {{name}}，今天是你们的 <strong>{{anniversary_name}}</strong>！</p>
      
      <div class="date">
        {{anniversary_date_formatted}}（{{anniversary_weekday}}）
      </div>

      <p>愿你们的爱情如初见般甜蜜，</p>
      <p>愿每一个纪念日都值得铭记 ❤️</p>
      
      <p>今天，请好好庆祝属于你们的特别时刻！</p>
      <p>🥂 拥抱、亲吻、晚餐、惊喜……一样都不能少！</p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; color: #999; font-size: 14px;">
      来自你们的爱情纪念日提醒系统 💕<br>
      {{current_date}}
    </div>
  </div>
</body>
</html>
```

## 🔧 系统逻辑

```javascript
function determineEmailTemplate(daysLeft, reminderDays) {
  if (daysLeft === 0) {
    // 今天就是纪念日 → 发送庆祝邮件
    return {
      template: 'EMAILJS_TODAY_TEMPLATE_ID',
      type: 'CELEBRATION',
      includeDaysLeft: false
    };
  } else if (daysLeft > 0 && daysLeft <= reminderDays) {
    // 提前提醒
    return {
      template: 'EMAILJS_TEMPLATE_ID', 
      type: 'REMINDER',
      includeDaysLeft: true
    };
  } else {
    // 不发送邮件
    return null;
  }
}
```

## ✅ 配置检查清单

在EmailJS控制台中确保：

1. ✅ 创建了两个不同的模板
2. ✅ 提醒模板包含 `{{days_left}}` 参数
3. ✅ 庆祝模板**不包含** `{{days_left}}` 参数  
4. ✅ 两个模板都包含其他共同参数
5. ✅ 环境变量中配置了正确的模板ID

## 🧪 测试建议

1. **测试提前提醒**: 创建一个明天的纪念日，设置 `reminderDays=1`
2. **测试当天庆祝**: 创建一个今天的纪念日，设置 `reminderDays=0`
3. **检查日志**: 观察服务器日志中的模板选择逻辑
4. **验证参数**: 确认不同模板收到的参数是否正确

这样就能完美处理"还有0天"的问题，让当天变成真正的庆祝时刻！🎉