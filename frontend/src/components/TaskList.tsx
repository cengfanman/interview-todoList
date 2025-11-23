import React, { useEffect, useState, useCallback } from 'react';
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
  Radio,
  Card,
  Row,
  Col,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EyeOutlined, UserOutlined, FilterOutlined, ClearOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { taskService } from '../services/taskService';
import { teamService } from '../services/teamService';
import { Task, TaskStatus, TaskPriority, Team } from '../types';
import TaskDetail from './TaskDetail';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const { Option } = Select;
const { TextArea } = Input;

type TaskFilter = 'all' | 'my' | 'assigned' | 'following';

interface AdvancedFilters {
  startDate?: string;
  endDate?: string;
  creatorId?: string;
  assigneeId?: string;
  status?: TaskStatus;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

const TaskList: React.FC = () => {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();

  // 定义函数 - 必须在useEffect之前
  const loadAllUsers = async () => {
    try {
      const response = await api.get('/users');
      setAllUsers(response.data);
    } catch (error) {
      console.error('Failed to load users');
    }
  };

  const loadTeams = async () => {
    try {
      const data = await teamService.getAll();
      setTeams(data);
    } catch (error) {
      message.error('加载团队失败');
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const response = await api.get(`/teams/${teamId}`);
      setTeamMembers(response.data.members || []);
    } catch (error) {
      console.error('Failed to load team members');
    }
  };

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    loadTeamMembers(teamId);
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await taskService.getAll();
      console.log('Loaded tasks:', data);
      console.log('Tasks with subtasks:', data.filter(t => t.subtasks && t.subtasks.length > 0));
      setTasks(data);
      setFilteredTasks(data);

      // 如果当前有选中的任务，重新从列表中获取最新数据
      if (selectedTask) {
        const updatedTask = data.find((t: Task) => t.id === selectedTask.id);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        }
      }
    } catch (error) {
      message.error('加载任务失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTasksWithFilters = async () => {
    try {
      setLoading(true);
      const data = await taskService.getAll(advancedFilters);
      console.log('Advanced filter result:', data);
      setTasks(data);
      setFilteredTasks(data);

      // 如果当前有选中的任务，重新从列表中获取最新数据
      if (selectedTask) {
        const updatedTask = data.find((t: Task) => t.id === selectedTask.id);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        }
      }
    } catch (error) {
      message.error('加载任务失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadTeams();
    loadAllUsers();
  }, []);

  // 当筛选条件改变时，重新加载任务
  useEffect(() => {
    console.log('useEffect triggered, user:', user, 'taskFilter:', taskFilter);
    // 优先使用 user.id，如果没有则从 localStorage 获取
    const currentUserId = user?.id || localStorage.getItem('userId');
    if (!currentUserId) {
      console.log('No user, skipping load');
      return;
    }

    if (Object.keys(advancedFilters).length > 0) {
      // 有高级筛选时使用高级筛选
      console.log('Using advanced filters');
      loadTasksWithFilters();
    } else {
      // 快捷筛选
      console.log('Using quick filter');
      const loadFilteredTasks = async () => {
        try {
          setLoading(true);
          let params: any = {};

          if (taskFilter === 'my') {
            params.creatorId = currentUserId;
          } else if (taskFilter === 'assigned') {
            params.assigneeId = currentUserId;
          }
          // taskFilter === 'all' 时 params 为空对象，会获取所有任务

          console.log('Quick filter params:', params);
          const data = await taskService.getAll(params);
          console.log('Quick filter result:', data);
          setTasks(data);
          setFilteredTasks(data);
        } catch (error) {
          message.error('加载任务失败');
        } finally {
          setLoading(false);
        }
      };

      loadFilteredTasks();
    }
  }, [taskFilter, advancedFilters, user]);

  const handleAdvancedFilter = (values: any) => {
    const filters: AdvancedFilters = {
      startDate: values.dateRange?.[0]?.toISOString(),
      endDate: values.dateRange?.[1]?.toISOString(),
      creatorId: values.creatorId,
      assigneeId: values.assigneeId,
      status: values.status,
      sortBy: values.sortBy,
      sortOrder: values.sortOrder,
    };
    setAdvancedFilters(filters);
    message.success('筛选已应用');
  };

  const handleClearFilters = () => {
    filterForm.resetFields();
    setAdvancedFilters({});
    message.info('筛选已清除');
  };

  const handleDelete = async (task: Task) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除任务"${task.title}"吗？此操作不可恢复。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await taskService.delete(task.id);
          message.success('任务已删除');
          loadTasksWithFilters();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleCreate = async (values: any) => {
    try {
      await taskService.create({
        ...values,
        startTime: values.startTime?.toISOString(),
        dueTime: values.dueTime?.toISOString(),
        followerIds: values.followerIds || [],
      });
      message.success('任务创建成功');
      setIsModalVisible(false);
      form.resetFields();
      setSelectedTeamId('');
      setTeamMembers([]);
      loadTasks();
    } catch (error) {
      message.error('创建任务失败');
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
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => {
        console.log('Rendering task:', text, 'subtasks:', record.subtasks);
        return (
          <Space>
            <strong>{text}</strong>
            {record.subtasks && record.subtasks.length > 0 && (
              <Tag color="blue">{record.subtasks.length} 个子任务</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: TaskStatus) => {
        const statusMap = {
          [TaskStatus.PENDING]: '待处理',
          [TaskStatus.IN_PROGRESS]: '进行中',
          [TaskStatus.COMPLETED]: '已完成',
          [TaskStatus.CANCELLED]: '已取消',
        };
        return <Tag color={getStatusColor(status)}>{statusMap[status]}</Tag>;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: TaskPriority) => {
        const priorityMap = {
          [TaskPriority.LOW]: '低',
          [TaskPriority.MEDIUM]: '中',
          [TaskPriority.HIGH]: '高',
          [TaskPriority.URGENT]: '紧急',
        };
        return <Tag color={getPriorityColor(priority)}>{priorityMap[priority]}</Tag>;
      },
    },
    {
      title: '执行人',
      dataIndex: ['assignee', 'username'],
      key: 'assignee',
      render: (text) => text || '-',
    },
    {
      title: '截止时间',
      dataIndex: 'dueTime',
      key: 'dueTime',
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => setSelectedTask(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            danger
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>我的任务</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          新建任务
        </Button>
      </div>

      {/* 任务筛选 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Radio.Group value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)} buttonStyle="solid">
            <Radio.Button value="all">所有任务</Radio.Button>
            <Radio.Button value="my">我创建的</Radio.Button>
            <Radio.Button value="assigned">指派给我的</Radio.Button>
            <Radio.Button value="following">我关注的</Radio.Button>
          </Radio.Group>
          <Button 
            icon={<FilterOutlined />}
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          >
            {showAdvancedFilter ? '隐藏筛选' : '高级筛选'}
          </Button>
          <Tag color="blue">
            共 {filteredTasks.length} 个任务
          </Tag>
        </Space>
      </div>

      {/* 高级筛选面板 */}
      {showAdvancedFilter && (
        <Card 
          size="small" 
          style={{ marginBottom: 16 }}
          title={
            <Space>
              <FilterOutlined />
              <span>高级筛选</span>
            </Space>
          }
        >
          <Form 
            form={filterForm}
            layout="vertical"
            onFinish={handleAdvancedFilter}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="dateRange" label="时段筛选（创建时间）">
                  <DatePicker.RangePicker 
                    style={{ width: '100%' }}
                    showTime
                    placeholder={['开始时间', '结束时间']}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="creatorId" label="创建人筛选">
                  <Select placeholder="选择创建人" allowClear>
                    {allUsers.map((user) => (
                      <Select.Option key={user.id} value={user.id}>
                        <UserOutlined /> {user.username}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="assigneeId" label="执行人筛选">
                  <Select placeholder="选择执行人" allowClear>
                    {allUsers.map((user) => (
                      <Select.Option key={user.id} value={user.id}>
                        <UserOutlined /> {user.username}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="status" label="状态筛选">
                  <Select placeholder="选择状态" allowClear>
                    <Select.Option value={TaskStatus.PENDING}>待处理</Select.Option>
                    <Select.Option value={TaskStatus.IN_PROGRESS}>进行中</Select.Option>
                    <Select.Option value={TaskStatus.COMPLETED}>已完成</Select.Option>
                    <Select.Option value={TaskStatus.CANCELLED}>已取消</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="sortBy" label="排序字段" initialValue="createdAt">
                  <Select>
                    <Select.Option value="createdAt">创建时间</Select.Option>
                    <Select.Option value="dueTime">截止时间</Select.Option>
                    <Select.Option value="creatorId">创建者</Select.Option>
                    <Select.Option value="id">任务ID</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="sortOrder" label="排序方式" initialValue="DESC">
                  <Select>
                    <Select.Option value="DESC">降序</Select.Option>
                    <Select.Option value="ASC">升序</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={24}>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<FilterOutlined />}>
                    应用筛选
                  </Button>
                  <Button onClick={handleClearFilters} icon={<ClearOutlined />}>
                    清除筛选
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>
      )}

      <Table
        columns={columns}
        dataSource={filteredTasks}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="新建任务"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setSelectedTeamId('');
          setTeamMembers([]);
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="title"
            label="任务标题"
            rules={[{ required: true, message: '请输入任务标题' }]}
          >
            <Input placeholder="请输入任务标题" />
          </Form.Item>

          <Form.Item name="description" label="任务描述">
            <TextArea rows={4} placeholder="请输入任务描述（可选）" />
          </Form.Item>

          <Form.Item
            name="teamId"
            label="所属团队"
            rules={[{ required: true, message: '请选择团队' }]}
          >
            <Select placeholder="请选择团队" onChange={handleTeamChange}>
              {teams.map((team) => (
                <Option key={team.id} value={team.id}>
                  {team.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="assigneeId" label="指派执行人">
            <Select placeholder="选择执行人（可选）" allowClear disabled={!selectedTeamId}>
              {teamMembers.map((member) => (
                <Select.Option key={member.user.id} value={member.user.id}>
                  <UserOutlined /> {member.user.username}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="followerIds" label="添加关注人">
            <Select 
              mode="multiple"
              placeholder="选择关注人（可选，可多选）" 
              allowClear
              disabled={!selectedTeamId}
            >
              {teamMembers.map((member) => (
                <Select.Option key={member.user.id} value={member.user.id}>
                  <UserOutlined /> {member.user.username}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="priority" label="优先级" initialValue={TaskPriority.MEDIUM}>
            <Select>
              <Option value={TaskPriority.LOW}>低</Option>
              <Option value={TaskPriority.MEDIUM}>中</Option>
              <Option value={TaskPriority.HIGH}>高</Option>
              <Option value={TaskPriority.URGENT}>紧急</Option>
            </Select>
          </Form.Item>

          <Form.Item name="startTime" label="开始时间">
            <DatePicker showTime style={{ width: '100%' }} placeholder="选择开始时间（可选）" />
          </Form.Item>

          <Form.Item name="dueTime" label="截止时间">
            <DatePicker showTime style={{ width: '100%' }} placeholder="选择截止时间（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建任务
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="任务详情"
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
