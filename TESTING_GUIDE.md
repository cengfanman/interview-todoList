# 测试指南

## 1. 时区设置验证

### 验证方法

重新构建并启动项目后，验证时区是否正确：

```bash
# 重新构建
docker-compose down
docker-compose up --build -d

# 检查后端容器时区
docker exec -it todolist-backend date
# 应该显示：CST (中国标准时间)

# 检查MySQL时区
docker exec -it todolist-mysql mysql -u root -proot_password -e "SELECT NOW();"
# 应该显示北京时间

# 检查Node.js环境时区
docker exec -it todolist-backend node -e "console.log(new Date().toString())"
# 应该显示 GMT+0800 (中国标准时间)
```

### 预期结果
- ✅ 后端容器：Asia/Shanghai (CST)
- ✅ MySQL：+08:00
- ✅ Node.js Date对象：GMT+0800

---

## 2. 定时任务功能测试

由于定时任务（消息提醒、重复任务）只有文字设计，以下是**如何实现和测试**的完整指南。

### 2.1 快速实现消息提醒定时任务

如果您想快速测试定时任务功能，可以按以下步骤实现：

#### 步骤 1：安装依赖

```bash
cd backend
npm install @nestjs/schedule
```

#### 步骤 2：创建简单的测试定时任务

在 `backend/src/` 创建 `test-scheduler.service.ts`：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TestSchedulerService {
  private readonly logger = new Logger(TestSchedulerService.name);

  // 每分钟运行一次（测试用）
  @Cron(CronExpression.EVERY_MINUTE)
  handleEveryMinute() {
    const now = new Date();
    this.logger.log(`定时任务执行 - 当前时间：${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  }

  // 每小时运行一次
  @Cron(CronExpression.EVERY_HOUR)
  handleEveryHour() {
    this.logger.log('每小时任务执行');
  }

  // 每天凌晨2点运行
  @Cron('0 2 * * *')
  handleDailyTask() {
    this.logger.log('每日凌晨2点任务执行');
  }

  // 自定义：每5分钟运行一次
  @Cron('*/5 * * * *')
  handleEvery5Minutes() {
    this.logger.log('每5分钟任务执行');
  }
}
```

#### 步骤 3：在 AppModule 中注册

编辑 `backend/src/app.module.ts`，添加：

```typescript
import { ScheduleModule } from '@nestjs/schedule';
import { TestSchedulerService } from './test-scheduler.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),  // 添加这行
    // ... 其他 imports
  ],
  providers: [
    TestSchedulerService,  // 添加这行
    // ... 其他 providers
  ],
})
export class AppModule {}
```

#### 步骤 4：测试定时任务

```bash
# 重新构建
docker-compose down
docker-compose up --build

# 查看日志，应该每分钟看到一次输出
docker logs -f todolist-backend

# 预期输出类似：
# [TestSchedulerService] 定时任务执行 - 当前时间：2025/11/22 21:30:00
```

---

### 2.2 测试任务即将到期提醒

如果要测试完整的任务提醒功能：

#### 测试步骤

1. **创建测试任务**
   - 登录系统
   - 创建一个任务，设置截止时间为"当前时间 + 25 小时"
   - 设置任务执行人

2. **修改定时器为快速模式（测试用）**
   
   将检查频率从每小时改为每分钟：
   
   ```typescript
   // 测试模式：每分钟检查一次
   @Cron(CronExpression.EVERY_MINUTE)
   async checkDueTasks() {
     const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
     const tasks = await this.taskRepository.find({
       where: {
         dueTime: Between(new Date(), tomorrow),
         status: Not(TaskStatus.COMPLETED)
       },
       relations: ['assignee', 'followers', 'creator']
     });
     
     this.logger.log(`找到 ${tasks.length} 个即将到期的任务`);
     
     for (const task of tasks) {
       this.logger.log(`任务 "${task.title}" 将在 ${task.dueTime} 到期`);
       // 这里添加发送通知的逻辑
     }
   }
   ```

3. **验证输出**
   
   查看后端日志，应该能看到：
   ```
   [NotificationScheduler] 找到 1 个即将到期的任务
   [NotificationScheduler] 任务 "测试任务" 将在 2025-11-23 22:30:00 到期
   ```

---

### 2.3 测试重复任务生成

#### 测试步骤

1. **创建重复任务规则**
   
   在数据库中插入测试数据：
   
   ```sql
   -- 插入一个每天重复的任务模板
   INSERT INTO recurring_tasks (
     id, 
     task_template_id, 
     recurrence_type, 
     recurrence_pattern,
     start_date,
     is_active,
     next_generation_at
   ) VALUES (
     UUID(),
     '任务模板ID',
     'daily',
     '{"interval": 1, "unit": "days"}',
     NOW(),
     1,
     NOW()
   );
   ```

2. **实现并运行定时生成服务**
   
   ```typescript
   @Cron('*/5 * * * *')  // 每5分钟运行一次（测试用）
   async generateRecurringTasks() {
     this.logger.log('开始生成重复任务');
     
     const recurringTasks = await this.recurringTaskRepository.find({
       where: {
         isActive: true,
         nextGenerationAt: LessThanOrEqual(new Date())
       }
     });
     
     this.logger.log(`找到 ${recurringTasks.length} 个需要生成的重复任务`);
     
     // 生成任务逻辑...
   }
   ```

3. **查看日志验证**
   
   ```bash
   docker logs -f todolist-backend | grep "重复任务"
   ```

---

## 3. Cron 表达式说明

```
 ┌─────────────── 秒（可选，0-59）
 │ ┌───────────── 分钟（0-59）
 │ │ ┌─────────── 小时（0-23）
 │ │ │ ┌───────── 日期（1-31）
 │ │ │ │ ┌─────── 月份（1-12 或 JAN-DEC）
 │ │ │ │ │ ┌───── 星期（0-7 或 SUN-SAT，0和7都是周日）
 │ │ │ │ │ │
 * * * * * *
```

### 常用示例

| 表达式 | 说明 |
|--------|------|
| `*/5 * * * *` | 每5分钟 |
| `0 * * * *` | 每小时（整点） |
| `0 0 * * *` | 每天凌晨0点 |
| `0 2 * * *` | 每天凌晨2点 |
| `0 9 * * 1-5` | 周一到周五早上9点 |
| `0 0 1 * *` | 每月1号凌晨 |

### NestJS 预设的 Cron 表达式

```typescript
import { CronExpression } from '@nestjs/schedule';

CronExpression.EVERY_SECOND       // 每秒
CronExpression.EVERY_5_SECONDS    // 每5秒
CronExpression.EVERY_10_SECONDS   // 每10秒
CronExpression.EVERY_30_SECONDS   // 每30秒
CronExpression.EVERY_MINUTE       // 每分钟
CronExpression.EVERY_5_MINUTES    // 每5分钟
CronExpression.EVERY_10_MINUTES   // 每10分钟
CronExpression.EVERY_30_MINUTES   // 每30分钟
CronExpression.EVERY_HOUR         // 每小时
CronExpression.EVERY_DAY_AT_1AM   // 每天凌晨1点
CronExpression.EVERY_DAY_AT_2AM   // 每天凌晨2点
CronExpression.EVERY_DAY_AT_MIDNIGHT // 每天午夜
CronExpression.EVERY_DAY_AT_NOON  // 每天中午12点
CronExpression.EVERY_WEEK         // 每周
CronExpression.EVERY_MONTH        // 每月
CronExpression.EVERY_YEAR         // 每年
```

---

## 4. 推荐的测试流程

### 4.1 快速验证定时任务功能

1. **启动系统**
   ```bash
   docker-compose up --build
   ```

2. **添加测试定时任务**（如上面的 TestSchedulerService）

3. **观察日志**
   ```bash
   docker logs -f todolist-backend
   ```

4. **确认每分钟有输出**
   - ✅ 看到定时输出 → 定时器工作正常
   - ❌ 没有输出 → 检查 ScheduleModule 是否正确导入

### 4.2 性能测试

```bash
# 进入容器
docker exec -it todolist-backend sh

# 安装 htop 查看CPU使用率
apk add htop
htop

# 定时任务不应该占用过多CPU资源
```

---

## 5. 常见问题

### Q1: 定时任务时间不准确？
**A**: 检查容器时区是否设置为 `Asia/Shanghai`

```bash
docker exec -it todolist-backend date
# 应该显示北京时间
```

### Q2: 定时任务没有执行？
**A**: 检查是否正确导入 ScheduleModule

```typescript
@Module({
  imports: [ScheduleModule.forRoot()],  // 必须添加
})
```

### Q3: 如何临时禁用定时任务？
**A**: 在服务上添加条件判断

```typescript
@Cron(CronExpression.EVERY_MINUTE)
handleCron() {
  if (process.env.ENABLE_CRON !== 'true') {
    return;  // 跳过执行
  }
  // 执行逻辑...
}
```

### Q4: 定时任务如何防止重复执行？
**A**: 使用分布式锁或数据库记录

```typescript
@Cron(CronExpression.EVERY_HOUR)
async handleCron() {
  const lock = await this.getLock('task-name');
  if (!lock) {
    this.logger.log('任务正在执行，跳过');
    return;
  }
  
  try {
    // 执行任务
  } finally {
    await this.releaseLock('task-name');
  }
}
```

---

## 6. 生产环境建议

1. **日志管理**
   - 使用日志级别控制输出
   - 定时任务的日志单独记录
   - 添加错误告警

2. **监控告警**
   - 监控定时任务执行时间
   - 任务失败时发送告警
   - 记录执行历史

3. **容错处理**
   - 任务执行失败自动重试
   - 设置超时时间
   - 记录失败原因

4. **性能优化**
   - 避免在定时任务中进行大量计算
   - 使用消息队列处理耗时操作
   - 分批处理大量数据

---

## 7. 相关文档

- [NOTIFICATION_RECURRING_TASK_DESIGN.md](./NOTIFICATION_RECURRING_TASK_DESIGN.md) - 详细设计文档
- [NestJS Schedule 文档](https://docs.nestjs.com/techniques/task-scheduling)
- [Cron 表达式生成器](https://crontab.guru/)

