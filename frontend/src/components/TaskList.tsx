import React, { useEffect, useState } from 'react';
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
} from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { taskService } from '../services/taskService';
import { teamService } from '../services/teamService';
import { Task, TaskStatus, TaskPriority, Team } from '../types';
import TaskDetail from './TaskDetail';

const { Option } = Select;
const { TextArea } = Input;

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadTasks();
    loadTeams();
  }, []);

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
      render: (text) => <strong>{text}</strong>,
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

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>My Tasks</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          New Task
        </Button>
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
