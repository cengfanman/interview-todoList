# 时区配置和认证说明

## 📍 时区问题解答

### ❓ 现在的时间是什么时区？

**修改前**：UTC（协调世界时，比北京时间慢 8 小时）⏰

**修改后**：Asia/Shanghai（北京时间，东八区 GMT+0800）✅

---

### 🔧 已修改的文件

#### 1. `backend/Dockerfile`
- ✅ 在 Alpine Linux 镜像中安装并配置时区
- ✅ 设置系统时区为 Asia/Shanghai
- ✅ 确保 Node.js 应用使用北京时间

```dockerfile
# 添加的配置
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata
```

#### 2. `docker-compose.yml`

**MySQL 容器**：
- ✅ 环境变量：`TZ=Asia/Shanghai`
- ✅ 启动参数：`--default-time-zone='+08:00'`
- ✅ 确保数据库时间函数（NOW()、CURRENT_TIMESTAMP）返回北京时间

**Backend 容器**：
- ✅ 环境变量：`TZ=Asia/Shanghai`
- ✅ 确保 Node.js 的 Date 对象使用北京时间

---

### ✅ 验证时区设置

重新构建后，运行以下命令验证：

```bash
# 1. 检查后端容器时区
docker exec -it todolist-backend date
# 预期输出：CST (China Standard Time)
# 例如：Fri Nov 22 21:30:00 CST 2025

# 2. 检查 MySQL 时区
docker exec -it todolist-mysql mysql -u root -proot_password -e "SELECT NOW();"
# 预期输出：北京时间
# 例如：2025-11-22 21:30:00

# 3. 检查 Node.js 环境
docker exec -it todolist-backend node -e "console.log(new Date().toString())"
# 预期输出：包含 GMT+0800
# 例如：Fri Nov 22 2025 21:30:00 GMT+0800 (China Standard Time)

# 4. 检查环境变量
docker exec -it todolist-backend printenv TZ
# 预期输出：Asia/Shanghai
```

---

### 🎯 时区修改的影响

#### ✅ 正面影响
1. **任务时间显示正确**
   - 创建时间、更新时间、截止时间都显示北京时间
   - 历史记录的时间戳准确

2. **定时任务按北京时间执行**
   - 每日凌晨 2 点的任务会在北京时间 2:00 执行
   - 避免时区混淆导致的执行时间错误

3. **用户体验提升**
   - 时间显示符合中国用户习惯
   - 不需要手动换算时区

#### ⚠️ 注意事项
- 如果项目需要支持多时区用户，建议：
  - 数据库存储使用 UTC
  - 前端根据用户时区转换显示
  - 本次修改仅适用于中国大陆用户

---

## 🔐 JWT 认证说明

### ✅ 系统使用 JWT 认证

项目使用 **JWT（JSON Web Token）** 进行用户认证和授权。

---

### 📋 JWT 实现细节

#### 1. 依赖包
```json
{
  "@nestjs/jwt": "^10.x",
  "@nestjs/passport": "^10.x",
  "passport-jwt": "^4.x",
  "bcrypt": "^5.x"
}
```

#### 2. 认证流程

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│  用户    │         │  后端    │         │ 数据库   │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ 1. 注册/登录       │                   │
     ├──────────────────>│                   │
     │                   │ 2. 验证密码        │
     │                   ├──────────────────>│
     │                   │ 3. 用户信息        │
     │                   │<──────────────────┤
     │                   │                   │
     │                   │ 4. 生成 JWT       │
     │ 5. 返回 Token     │                   │
     │<──────────────────┤                   │
     │                   │                   │
     │ 6. 请求 API       │                   │
     │   (带 Token)      │                   │
     ├──────────────────>│                   │
     │                   │ 7. 验证 Token     │
     │                   │ 8. 解析用户ID     │
     │                   │ 9. 查询数据       │
     │                   ├──────────────────>│
     │                   │10. 返回数据       │
     │                   │<──────────────────┤
     │11. 返回结果       │                   │
     │<──────────────────┤                   │
```

#### 3. Token 配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **密钥** | `your-super-secret-jwt-key-change-in-production` | 用于签名和验证 Token |
| **有效期** | `7d` | Token 7 天后过期 |
| **算法** | `HS256` | HMAC SHA-256 |

⚠️ **生产环境必须修改密钥！**

#### 4. Token 格式

**HTTP Header**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Payload**:
```json
{
  "sub": "用户ID（UUID）",
  "email": "用户邮箱",
  "iat": 1700654321,  // 签发时间
  "exp": 1701259121   // 过期时间
}
```

#### 5. 密码加密

```typescript
// 注册时
const saltRounds = 10;
const passwordHash = await bcrypt.hash(password, saltRounds);

// 登录验证时
const isValid = await bcrypt.compare(password, user.passwordHash);
```

---

### 🔒 安全特性

✅ **已实现**：
- [x] 密码使用 bcrypt 加密存储（saltRounds=10）
- [x] JWT Token 有过期时间（7天）
- [x] 使用 Bearer Token 认证
- [x] 受保护的路由需要 JWT 验证
- [x] Token 包含用户 ID 和邮箱信息
- [x] Passport JWT Strategy 自动验证

🔧 **生产环境建议**：
- [ ] 更换强密钥（至少 256 位随机字符串）
- [ ] 缩短 Token 有效期（如 1 天）
- [ ] 实现 Refresh Token 机制
- [ ] 添加 Token 黑名单（注销功能）
- [ ] 使用 HTTPS 传输 Token
- [ ] 添加 Rate Limiting（防止暴力破解）
- [ ] 实现多因素认证（2FA）

---

### 📝 使用示例

#### 前端请求示例

```typescript
// 登录
const response = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

const { token, user } = response.data;

// 保存 Token
localStorage.setItem('token', token);

// 后续请求自动带上 Token（已在 api.ts 中配置）
const tasks = await api.get('/tasks');
```

#### API 拦截器配置

```typescript
// frontend/src/services/api.ts
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 🧪 如何测试定时任务

详细测试指南请查看：**[TESTING_GUIDE.md](./TESTING_GUIDE.md)**

### 快速测试步骤

1. **安装定时任务依赖**
   ```bash
   cd backend
   npm install @nestjs/schedule
   ```

2. **创建测试服务**
   ```typescript
   // backend/src/test-scheduler.service.ts
   import { Injectable, Logger } from '@nestjs/common';
   import { Cron, CronExpression } from '@nestjs/schedule';

   @Injectable()
   export class TestSchedulerService {
     private readonly logger = new Logger(TestSchedulerService.name);

     @Cron(CronExpression.EVERY_MINUTE)
     handleCron() {
       const now = new Date();
       this.logger.log(`定时任务执行 - ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
     }
   }
   ```

3. **注册服务**
   ```typescript
   // backend/src/app.module.ts
   import { ScheduleModule } from '@nestjs/schedule';
   import { TestSchedulerService } from './test-scheduler.service';

   @Module({
     imports: [
       ScheduleModule.forRoot(),
       // ...
     ],
     providers: [
       TestSchedulerService,
       // ...
     ],
   })
   export class AppModule {}
   ```

4. **查看日志**
   ```bash
   docker-compose up --build
   docker logs -f todolist-backend
   
   # 应该每分钟看到：
   # [TestSchedulerService] 定时任务执行 - 2025/11/22 21:30:00
   ```

---

## 🚀 重新部署

修改了时区配置后，需要重新构建：

```bash
# 停止并删除旧容器
docker-compose down

# 重新构建并启动
docker-compose up --build -d

# 查看日志
docker-compose logs -f

# 验证时区
docker exec -it todolist-backend date
docker exec -it todolist-mysql mysql -u root -proot_password -e "SELECT NOW();"
```

---

## 📚 相关文档

- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - 完整测试指南
- **[NOTIFICATION_RECURRING_TASK_DESIGN.md](./NOTIFICATION_RECURRING_TASK_DESIGN.md)** - 定时任务设计文档
- **[README.md](./README.md)** - 项目总览

---

## ❓ 常见问题

### Q: 为什么时间还是 UTC？
**A**: 确保重新构建了容器（`docker-compose up --build`）

### Q: JWT Token 过期后怎么办？
**A**: 
- 短期：用户重新登录获取新 Token
- 长期：实现 Refresh Token 机制

### Q: 如何更改 JWT 密钥？
**A**: 修改 `docker-compose.yml` 中的 `JWT_SECRET` 环境变量

### Q: 定时任务在什么时间运行？
**A**: 现在所有时间都基于北京时间（Asia/Shanghai）

---

**更新时间**: 2025-11-22  
**时区**: Asia/Shanghai (GMT+0800)  
**认证方式**: JWT (JSON Web Token)  
**Token 有效期**: 7 天

