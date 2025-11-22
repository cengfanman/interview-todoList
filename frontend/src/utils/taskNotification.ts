import { notification } from 'antd';
import dayjs from 'dayjs';
import { Task, TaskStatus } from '../types';

// 通知配置
const NOTIFICATION_CONFIG = {
  // 检查间隔（毫秒）- 每分钟检查一次
  CHECK_INTERVAL: 60 * 1000,
  
  // 提醒时间点（分钟）
  ALERT_TIMES: [
    { minutes: 60, message: '1小时', key: '60min' },
    { minutes: 30, message: '30分钟', key: '30min' },
    { minutes: 15, message: '15分钟', key: '15min' },
    { minutes: 5, message: '5分钟', key: '5min' },
  ],
};

// 记录已经提醒过的任务（避免重复提醒）
const notifiedTasks: Map<string, Set<string>> = new Map();

/**
 * 检查任务是否需要提醒
 */
export function checkTasksDueAlert(tasks: Task[]): void {
  const now = dayjs();

  tasks.forEach((task) => {
    // 只检查未完成且有截止时间的任务
    if (
      task.status === TaskStatus.COMPLETED ||
      task.status === TaskStatus.CANCELLED ||
      !task.dueTime
    ) {
      return;
    }

    const dueTime = dayjs(task.dueTime);
    const minutesUntilDue = dueTime.diff(now, 'minute');

    // 任务已逾期
    if (minutesUntilDue < 0) {
      showOverdueNotification(task);
      return;
    }

    // 检查是否需要提醒
    NOTIFICATION_CONFIG.ALERT_TIMES.forEach(({ minutes, message, key }) => {
      if (minutesUntilDue <= minutes && minutesUntilDue > minutes - 1) {
        // 检查是否已经提醒过
        if (!hasBeenNotified(task.id, key)) {
          showDueNotification(task, message, minutesUntilDue);
          markAsNotified(task.id, key);
        }
      }
    });
  });
}

/**
 * 显示即将到期通知
 */
function showDueNotification(task: Task, timeMessage: string, minutesLeft: number): void {
  const key = `due-${task.id}-${timeMessage}`;

  notification.warning({
    key,
    message: '⏰ 任务即将到期',
    description: `${task.title}\n还有 ${timeMessage} 截止！\n截止时间：${dayjs(task.dueTime).format('YYYY-MM-DD HH:mm')}`,
    duration: minutesLeft <= 5 ? 0 : 10, // 5分钟内的提醒不自动关闭
    placement: 'topRight',
  });

  // 请求浏览器通知权限并发送
  requestBrowserNotification(task, timeMessage);
}

/**
 * 显示逾期通知
 */
function showOverdueNotification(task: Task): void {
  const key = `overdue-${task.id}`;

  // 检查今天是否已经提醒过逾期
  if (hasBeenNotified(task.id, 'overdue-today')) {
    return;
  }

  const overdueHours = Math.abs(dayjs(task.dueTime).diff(dayjs(), 'hour'));
  const overdueMessage = overdueHours < 24 
    ? `逾期 ${overdueHours} 小时`
    : `逾期 ${Math.floor(overdueHours / 24)} 天`;

  notification.error({
    key,
    message: '⚠️ 任务已逾期',
    description: `${task.title}\n${overdueMessage}\n截止时间：${dayjs(task.dueTime).format('YYYY-MM-DD HH:mm')}`,
    duration: 0, // 不自动关闭
    placement: 'topRight',
  });

  markAsNotified(task.id, 'overdue-today');
}

/**
 * 浏览器桌面通知
 */
function requestBrowserNotification(task: Task, timeMessage: string): void {
  // 检查浏览器是否支持通知
  if (!('Notification' in window)) {
    return;
  }

  // 请求权限
  if (Notification.permission === 'granted') {
    sendBrowserNotification(task, timeMessage);
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        sendBrowserNotification(task, timeMessage);
      }
    });
  }
}

/**
 * 发送浏览器通知
 */
function sendBrowserNotification(task: Task, timeMessage: string): void {
  try {
    const notification = new Notification('任务即将到期', {
      body: `${task.title}\n还有 ${timeMessage} 截止！`,
      icon: '/favicon.ico',
      tag: `task-${task.id}`,
      requireInteraction: false, // 自动消失
      silent: false,
    });

    // 点击通知时聚焦到窗口
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error('Browser notification error:', error);
  }
}

/**
 * 检查是否已经提醒过
 */
function hasBeenNotified(taskId: string, key: string): boolean {
  const taskNotifications = notifiedTasks.get(taskId);
  return taskNotifications?.has(key) ?? false;
}

/**
 * 标记为已提醒
 */
function markAsNotified(taskId: string, key: string): void {
  if (!notifiedTasks.has(taskId)) {
    notifiedTasks.set(taskId, new Set());
  }
  notifiedTasks.get(taskId)!.add(key);
}

/**
 * 清除任务的提醒记录（任务完成或删除时调用）
 */
export function clearTaskNotifications(taskId: string): void {
  notifiedTasks.delete(taskId);
}

/**
 * 清除所有提醒记录（退出登录时调用）
 */
export function clearAllNotifications(): void {
  notifiedTasks.clear();
  notification.destroy();
}

/**
 * 启动任务到期检查
 */
export function startTaskDueChecker(
  getTasksFn: () => Task[],
  interval: number = NOTIFICATION_CONFIG.CHECK_INTERVAL
): NodeJS.Timeout {
  // 立即执行一次
  checkTasksDueAlert(getTasksFn());

  // 定时检查
  return setInterval(() => {
    const tasks = getTasksFn();
    checkTasksDueAlert(tasks);
  }, interval);
}

/**
 * 停止任务到期检查
 */
export function stopTaskDueChecker(timerId: NodeJS.Timeout): void {
  clearInterval(timerId);
}

/**
 * 请求浏览器通知权限
 */
export function requestNotificationPermission(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/**
 * 检查浏览器通知权限状态
 */
export function getNotificationPermission(): string | null {
  if ('Notification' in window) {
    return Notification.permission;
  }
  return null;
}

