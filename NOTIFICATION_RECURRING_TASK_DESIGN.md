# 消息提醒和定时重复任务功能设计

## 1. 消息提醒任务即将到期 (Task Due Notification)

### 功能描述
系统需要在任务接近到期时间时，自动向相关用户发送提醒通知。

### Schema 设计
已在数据库中实现 `notifications` 表，包含以下字段：
- `id`: 通知唯一标识
- `user_id`: 接收通知的用户ID
- `task_id`: 关联的任务ID
- `notification_type`: 通知类型（任务即将到期、任务分配、任务完成、新评论等）
- `title`: 通知标题
- `content`: 通知内容
- `is_read`: 是否已读
- `read_at`: 阅读时间
- `scheduled_at`: 计划发送时间
- `sent_at`: 实际发送时间
- `created_at`: 创建时间

### 实现流程

#### 1.1 定时任务调度服务
**使用技术**: NestJS + node-cron / @nestjs/schedule

**实现步骤**:
1. 创建 `NotificationSchedulerService`
2. 使用 `@Cron()` 装饰器，每小时运行一次扫描任务
3. 查询数据库，找出所有即将到期的任务（例如：24小时内到期）
4. 为每个任务创建通知记录

```typescript
// 伪代码示例
@Cron('0 * * * *') // 每小时运行
async checkDueTasks() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tasks = await this.taskRepository.find({
    where: {
      dueTime: Between(new Date(), tomorrow),
      status: Not(TaskStatus.COMPLETED)
    },
    relations: ['assignee', 'followers', 'creator']
  });

  for (const task of tasks) {
    // 为执行人、关注者创建通知
    await this.createNotifications(task);
  }
}
```

#### 1.2 通知发送服务
**使用技术**:
- 邮件: NodeMailer
- 站内通知: WebSocket (Socket.io)
- 推送通知: Firebase Cloud Messaging (可选)

**实现步骤**:
1. 创建 `NotificationService`
2. 实现多种通知渠道（邮件、WebSocket、推送）
3. 根据用户偏好选择通知方式

```typescript
// 伪代码示例
async sendNotification(notification: Notification) {
  // 1. 发送邮件
  await this.emailService.send({
    to: notification.user.email,
    subject: notification.title,
    body: notification.content
  });

  // 2. 发送WebSocket实时通知
  this.socketGateway.sendToUser(notification.userId, {
    type: 'notification',
    data: notification
  });

  // 3. 更新通知状态
  notification.sentAt = new Date();
  await this.notificationRepository.save(notification);
}
```

#### 1.3 通知规则配置
- 任务到期前 24 小时：发送第一次提醒
- 任务到期前 1 小时：发送紧急提醒
- 任务逾期后：每天发送逾期提醒

### 相关模块依赖
- `@nestjs/schedule`: 定时任务调度
- `nodemailer`: 邮件发送
- `@nestjs/websockets`: WebSocket实时通知
- `socket.io`: WebSocket实现
- `bull` (可选): 消息队列，处理大量通知

---

## 2. 定时重复任务 (Recurring Tasks)

### 功能描述
系统支持创建重复任务模板，根据设定的规则自动生成新任务。

### Schema 设计
已在数据库中实现以下表：

#### `recurring_tasks` 表
- `id`: 重复任务规则ID
- `task_template_id`: 任务模板ID（关联到 tasks 表）
- `recurrence_type`: 重复类型（daily/weekly/monthly/yearly/custom）
- `recurrence_pattern`: 重复规则（JSON格式）
- `start_date`: 开始日期
- `end_date`: 结束日期（NULL表示无限重复）
- `is_active`: 是否启用
- `last_generated_at`: 最后生成任务时间
- `next_generation_at`: 下次生成任务时间
- `created_at`: 创建时间
- `updated_at`: 更新时间

#### `generated_tasks` 表
- `id`: 记录ID
- `recurring_task_id`: 重复任务规则ID
- `task_id`: 生成的实际任务ID
- `generation_date`: 生成日期
- `created_at`: 创建时间

### 重复规则 (recurrence_pattern) JSON 格式示例

#### 每日重复
```json
{
  "interval": 1,
  "unit": "days"
}
```

#### 每周重复（周一、周三、周五）
```json
{
  "interval": 1,
  "unit": "weeks",
  "daysOfWeek": [1, 3, 5]  // 0=周日, 1=周一, ..., 6=周六
}
```

#### 每月重复（每月15号）
```json
{
  "interval": 1,
  "unit": "months",
  "dayOfMonth": 15
}
```

#### 自定义复杂规则（每2周的周一）
```json
{
  "interval": 2,
  "unit": "weeks",
  "daysOfWeek": [1]
}
```

### 实现流程

#### 2.1 重复任务生成服务
**使用技术**: NestJS + node-cron / @nestjs/schedule

**实现步骤**:
1. 创建 `RecurringTaskService`
2. 使用定时任务，每天凌晨运行
3. 查询所有活跃的重复任务规则
4. 根据规则生成新任务

```typescript
// 伪代码示例
@Cron('0 0 * * *') // 每天凌晨0点运行
async generateRecurringTasks() {
  const today = new Date();

  // 查询需要生成的重复任务
  const recurringTasks = await this.recurringTaskRepository.find({
    where: {
      isActive: true,
      nextGenerationAt: LessThanOrEqual(today)
    },
    relations: ['taskTemplate']
  });

  for (const recurring of recurringTasks) {
    // 生成新任务
    const newTask = await this.createTaskFromTemplate(
      recurring.taskTemplate,
      recurring
    );

    // 记录生成历史
    await this.generatedTaskRepository.save({
      recurringTaskId: recurring.id,
      taskId: newTask.id,
      generationDate: today
    });

    // 计算下次生成时间
    const nextDate = this.calculateNextDate(
      recurring.recurrencePattern,
      today
    );

    recurring.lastGeneratedAt = today;
    recurring.nextGenerationAt = nextDate;
    await this.recurringTaskRepository.save(recurring);
  }
}
```

#### 2.2 日期计算逻辑
**使用库**: `dayjs` 或 `date-fns`

```typescript
calculateNextDate(pattern: RecurrencePattern, currentDate: Date): Date {
  const { interval, unit, daysOfWeek, dayOfMonth } = pattern;

  switch (unit) {
    case 'days':
      return dayjs(currentDate).add(interval, 'day').toDate();

    case 'weeks':
      // 如果指定了星期几，找到下一个符合的日期
      if (daysOfWeek && daysOfWeek.length > 0) {
        return this.findNextWeekday(currentDate, daysOfWeek, interval);
      }
      return dayjs(currentDate).add(interval, 'week').toDate();

    case 'months':
      if (dayOfMonth) {
        return dayjs(currentDate)
          .add(interval, 'month')
          .date(dayOfMonth)
          .toDate();
      }
      return dayjs(currentDate).add(interval, 'month').toDate();

    case 'years':
      return dayjs(currentDate).add(interval, 'year').toDate();

    default:
      throw new Error('Invalid recurrence unit');
  }
}
```

#### 2.3 从模板创建任务
```typescript
async createTaskFromTemplate(
  template: Task,
  recurring: RecurringTask
): Promise<Task> {
  const newTask = this.taskRepository.create({
    title: template.title,
    description: template.description,
    priority: template.priority,
    teamId: template.teamId,
    creatorId: template.creatorId,
    assigneeId: template.assigneeId,

    // 根据重复规则调整时间
    startTime: this.adjustDate(template.startTime, recurring),
    dueTime: this.adjustDate(template.dueTime, recurring),

    status: TaskStatus.PENDING
  });

  return await this.taskRepository.save(newTask);
}
```

### 用户界面流程

#### 创建重复任务
1. 用户创建任务时，勾选"设为重复任务"
2. 选择重复类型（每日/每周/每月/自定义）
3. 配置重复规则（间隔、星期几、日期等）
4. 设置重复的起止时间
5. 系统创建任务模板和重复规则记录

#### 管理重复任务
1. 查看所有重复任务规则列表
2. 编辑规则（修改频率、时间等）
3. 暂停/恢复重复任务
4. 查看已生成的任务历史
5. 删除重复规则（可选择是否删除已生成的任务）

### 相关模块依赖
- `@nestjs/schedule`: 定时任务
- `dayjs` 或 `date-fns`: 日期计算
- `rrule` (可选): 复杂重复规则解析库

---

## 3. 系统架构补充

### 3.1 后端新增模块
```
backend/src/
├── notifications/
│   ├── notifications.module.ts
│   ├── notifications.service.ts
│   ├── notifications.controller.ts
│   ├── notifications.gateway.ts  (WebSocket)
│   ├── notification-scheduler.service.ts
│   └── entities/
│       └── notification.entity.ts
├── recurring-tasks/
│   ├── recurring-tasks.module.ts
│   ├── recurring-tasks.service.ts
│   ├── recurring-tasks.controller.ts
│   ├── recurring-task-scheduler.service.ts
│   └── entities/
│       ├── recurring-task.entity.ts
│       └── generated-task.entity.ts
└── email/
    ├── email.module.ts
    └── email.service.ts
```

### 3.2 前端新增功能
```
frontend/src/
├── components/
│   ├── NotificationCenter.tsx  (通知中心)
│   ├── RecurringTaskForm.tsx   (重复任务表单)
│   └── RecurringTaskList.tsx   (重复任务列表)
└── services/
    ├── notificationService.ts
    └── recurringTaskService.ts
```

### 3.3 环境变量补充
```env
# Email Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-password
MAIL_FROM=TodoList <noreply@todolist.com>

# WebSocket Configuration
WS_PORT=3001
WS_PATH=/socket.io

# Notification Settings
NOTIFICATION_DUE_HOURS=24  # 到期前多少小时提醒
NOTIFICATION_URGENT_HOURS=1  # 紧急提醒时间
```

---

## 4. 性能优化建议

### 4.1 通知系统优化
- 使用消息队列（Bull/Redis）处理大量通知
- 批量发送邮件，避免频繁SMTP连接
- 实现通知合并，避免用户收到过多通知
- 添加用户通知偏好设置（频率、渠道）

### 4.2 重复任务优化
- 预生成未来N天的任务，减少实时计算
- 使用索引优化 `next_generation_at` 查询
- 大量重复任务时，考虑分批处理
- 添加重复任务数量限制，防止滥用

### 4.3 数据库优化
- 对 `notifications.scheduled_at` 添加索引
- 对 `recurring_tasks.next_generation_at` 添加索引
- 定期清理已读且过期的通知记录
- 对生成任务历史表进行分区

---

## 5. 测试计划

### 5.1 通知测试
- [ ] 任务到期前24小时触发通知
- [ ] 任务到期前1小时触发紧急通知
- [ ] 任务逾期后每天触发提醒
- [ ] WebSocket实时推送功能
- [ ] 邮件发送功能
- [ ] 通知已读状态更新

### 5.2 重复任务测试
- [ ] 每日重复任务生成
- [ ] 每周指定日期重复任务
- [ ] 每月指定日期重复任务
- [ ] 跨月/跨年边界情况
- [ ] 重复任务暂停/恢复
- [ ] 重复任务编辑后生效
- [ ] 删除重复任务规则

---

## 6. 未来扩展

### 6.1 通知系统扩展
- 支持短信通知
- 支持移动推送（iOS/Android）
- 支持第三方集成（Slack、Discord、企业微信）
- AI智能通知（根据用户习惯优化提醒时间）

### 6.2 重复任务扩展
- 支持更复杂的重复规则（如"每月最后一个工作日"）
- 支持排除日期（节假日不生成任务）
- 支持任务链（A完成后自动创建B）
- 批量编辑生成的任务
