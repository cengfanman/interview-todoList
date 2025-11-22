import React, { useEffect, useState, useRef } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Drawer,
  Alert,
  Switch,
} from 'antd';
import { PlusOutlined, EyeOutlined, BellOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { taskService } from '../services/taskService';
import { teamService } from '../services/teamService';
import { Task, TaskStatus, TaskPriority, Team } from '../types';
import TaskDetail from './TaskDetail';
import {
  startTaskDueChecker,
  stopTaskDueChecker,
  clearAllNotifications,
  requestNotificationPermission,
  getNotificationPermission,
} from '../utils/taskNotification';

const { Option } = Select;
const { TextArea } = Input;

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<string | null>(null);
  const [form] = Form.useForm();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTasks();
    loadTeams();
    
    // 检查浏览器通知权限
    const permission = getNotificationPermission();
    setBrowserNotificationPermission(permission);

    // 启动任务到期检查
    if (notificationEnabled) {
      timerRef.current = startTaskDueChecker(() => tasks);
    }

    // 清理函数
    return () => {
      if (timerRef.current) {
        stopTaskDueChecker(timerRef.current);
      }
      clearAllNotifications();
    };
  }, []);

  // 当任务列表更新或通知开关变化时，重新启动检查
  useEffect(() => {
    if (timerRef.current) {
      stopTaskDueChecker(timerRef.current);
    }

    if (notificationEnabled && tasks.length > 0) {
      timerRef.current = startTaskDueChecker(() => tasks);
    }

    return () => {
      if (timerRef.current) {
        stopTaskDueChecker(timerRef.current);
      }
    };
  }, [tasks, notificationEnabled]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await taskService.getAll();
      setTasks(data);
    } catch (error) {
      message.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const data = await teamService.getAll();
      setTeams(data);
    } catch (error) {
      message.error('Failed to load teams');
    }
  };

  const handleCreate = async (values: any) => {
    try {
      await taskService.create({
        ...values,
        startTime: values.startTime?.toISOString(),
        dueTime: values.dueTime?.toISOString(),
      });
      message.success('Task created successfully');
      setIsModalVisible(false);
      form.resetFields();
      loadTasks();
    } catch (error) {
      message.error('Failed to create task');
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    const colors = {
      pending: 'default',
      in_progress: 'processing',
      completed: 'success',
      cancelled: 'error',
    };
    return colors[status];
  };

  const getPriorityColor = (priority: TaskPriority) => {
    const colors = {
      low: 'green',
      medium: 'blue',
      high: 'orange',
      urgent: 'red',
    };
    return colors[priority];
  };

  const columns: ColumnsType<Task> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Space>
          <strong>{text}</strong>
          {record.subtasks && record.subtasks.length > 0 && (
            <Tag color="blue">{record.subtasks.length} subtasks</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: TaskStatus) => (
        <Tag color={getStatusColor(status)}>{status.replace('_', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: TaskPriority) => (
        <Tag color={getPriorityColor(priority)}>{priority.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Assignee',
      dataIndex: ['assignee', 'username'],
      key: 'assignee',
      render: (text) => text || '-',
    },
    {
      title: 'Due Date',
      dataIndex: 'dueTime',
      key: 'dueTime',
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => setSelectedTask(record)}
          >
            View
          </Button>
        </Space>
      ),
    },
  ];

  const handleNotificationToggle = (checked: boolean) => {
    setNotificationEnabled(checked);
    if (checked) {
      message.success('任务到期提醒已启用');
      // 请求浏览器通知权限
      if (browserNotificationPermission === 'default') {
        requestNotificationPermission();
        setTimeout(() => {
          setBrowserNotificationPermission(getNotificationPermission());
        }, 1000);
      }
    } else {
      message.info('任务到期提醒已关闭');
      clearAllNotifications();
    }
  };

  const handleEnableBrowserNotification = () => {
    requestNotificationPermission();
    setTimeout(() => {
      const permission = getNotificationPermission();
      setBrowserNotificationPermission(permission);
      if (permission === 'granted') {
        message.success('浏览器通知权限已授予');
      } else if (permission === 'denied') {
        message.error('浏览器通知权限被拒绝，请在浏览器设置中启用');
      }
    }, 1000);
  };

  return (
    <div>
      {/* 通知设置提示 */}
      {browserNotificationPermission === 'default' && notificationEnabled && (
        <Alert
          message="启用桌面通知"
          description={
            <div>
              <div style={{ marginBottom: 8 }}>
                启用桌面通知后，即使浏览器在后台运行，您也能收到任务到期提醒。
              </div>
              <Button size="small" type="primary" onClick={handleEnableBrowserNotification}>
                授予通知权限
              </Button>
            </div>
          }
          type="info"
          closable
          style={{ marginBottom: 16 }}
          icon={<BellOutlined />}
        />
      )}

      {browserNotificationPermission === 'denied' && notificationEnabled && (
        <Alert
          message="浏览器通知已被阻止"
          description="如需启用桌面通知，请在浏览器设置中允许本网站显示通知。"
          type="warning"
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>My Tasks</h2>
        <Space>
          <Space>
            <BellOutlined style={{ color: notificationEnabled ? '#1890ff' : '#999' }} />
            <span>任务提醒</span>
            <Switch
              checked={notificationEnabled}
              onChange={handleNotificationToggle}
              checkedChildren="开"
              unCheckedChildren="关"
            />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            New Task
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="Create New Task"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please input task title' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="teamId"
            label="Team"
            rules={[{ required: true, message: 'Please select a team' }]}
          >
            <Select placeholder="Select team">
              {teams.map((team) => (
                <Option key={team.id} value={team.id}>
                  {team.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="priority" label="Priority" initialValue={TaskPriority.MEDIUM}>
            <Select>
              <Option value={TaskPriority.LOW}>Low</Option>
              <Option value={TaskPriority.MEDIUM}>Medium</Option>
              <Option value={TaskPriority.HIGH}>High</Option>
              <Option value={TaskPriority.URGENT}>Urgent</Option>
            </Select>
          </Form.Item>

          <Form.Item name="startTime" label="Start Time">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="dueTime" label="Due Time">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Create
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Task Details"
        width={720}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      >
        {selectedTask && (
          <TaskDetail task={selectedTask} onUpdate={loadTasks} onClose={() => setSelectedTask(null)} />
        )}
      </Drawer>
    </div>
  );
};

export default TaskList;
