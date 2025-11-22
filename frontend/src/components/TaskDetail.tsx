import React, { useEffect, useState } from 'react';
import {
  Descriptions,
  Tag,
  Button,
  Space,
  Timeline,
  Input,
  Form,
  Select,
  message,
  Divider,
  Modal,
  List,
  Card,
  DatePicker,
} from 'antd';
import { PlusOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { taskService } from '../services/taskService';
import { Task, TaskHistory, TaskStatus, TaskPriority } from '../types';
import api from '../services/api';

const { TextArea } = Input;
const { Option } = Select;

interface TaskDetailProps {
  task: Task;
  onUpdate: () => void;
  onClose: () => void;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, onUpdate, onClose }) => {
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isSubtaskModalVisible, setIsSubtaskModalVisible] = useState(false);
  const [commentForm] = Form.useForm();
  const [subtaskForm] = Form.useForm();

  useEffect(() => {
    loadHistory();
    loadTeamMembers();
  }, [task.id]);

  const loadHistory = async () => {
    try {
      const data = await taskService.getHistory(task.id);
      setHistory(data);
    } catch (error) {
      message.error('Failed to load history');
    }
  };

  const loadTeamMembers = async () => {
    try {
      const response = await api.get(`/teams/${task.teamId}`);
      setTeamMembers(response.data.members || []);
    } catch (error) {
      console.error('Failed to load team members');
    }
  };

  const handleStatusChange = async (status: TaskStatus) => {
    try {
      await taskService.update(task.id, { status });
      message.success('Status updated');
      onUpdate();
      loadHistory();
    } catch (error) {
      message.error('Failed to update status');
    }
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    try {
      await taskService.update(task.id, { assigneeId });
      message.success('Assignee updated');
      onUpdate();
      loadHistory();
    } catch (error) {
      message.error('Failed to update assignee');
    }
  };

  const handleCreateSubtask = async (values: any) => {
    try {
      setLoading(true);
      await taskService.create({
        ...values,
        teamId: task.teamId,
        parentTaskId: task.id,
        startTime: values.startTime?.toISOString(),
        dueTime: values.dueTime?.toISOString(),
      });
      message.success('Subtask created successfully');
      setIsSubtaskModalVisible(false);
      subtaskForm.resetFields();
      onUpdate();
      loadHistory();
    } catch (error) {
      message.error('Failed to create subtask');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (values: { comment: string }) => {
    try {
      setLoading(true);
      await taskService.addComment(task.id, values.comment);
      message.success('评论已添加');
      commentForm.resetFields();
      loadHistory();
    } catch (error) {
      message.error('添加评论失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string, subtaskTitle: string) => {
    Modal.confirm({
      title: '确认删除子任务',
      content: `确定要删除子任务"${subtaskTitle}"吗？此操作不可恢复。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await taskService.delete(subtaskId);
          message.success('子任务已删除');
          onUpdate();
          loadHistory();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubtaskStatusChange = async (subtaskId: string, status: TaskStatus) => {
    try {
      await taskService.update(subtaskId, { status });
      message.success('子任务状态已更新');
      onUpdate();
      loadHistory();
    } catch (error) {
      message.error('更新失败');
    }
  };

  return (
    <div>
      <Descriptions column={1} bordered>
        <Descriptions.Item label="任务标题">{task.title}</Descriptions.Item>
        <Descriptions.Item label="任务描述">
          {task.description || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="任务状态">
          <Space>
            <Tag color={task.status === TaskStatus.COMPLETED ? 'success' : 'processing'}>
              {{
                [TaskStatus.PENDING]: '待处理',
                [TaskStatus.IN_PROGRESS]: '进行中',
                [TaskStatus.COMPLETED]: '已完成',
                [TaskStatus.CANCELLED]: '已取消',
              }[task.status]}
            </Tag>
            <Select
              value={task.status}
              onChange={handleStatusChange}
              style={{ width: 120 }}
              size="small"
            >
              <Option value={TaskStatus.PENDING}>待处理</Option>
              <Option value={TaskStatus.IN_PROGRESS}>进行中</Option>
              <Option value={TaskStatus.COMPLETED}>已完成</Option>
              <Option value={TaskStatus.CANCELLED}>已取消</Option>
            </Select>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="优先级">
          <Tag color={task.priority === TaskPriority.URGENT ? 'red' : 'blue'}>
            {{
              [TaskPriority.LOW]: '低',
              [TaskPriority.MEDIUM]: '中',
              [TaskPriority.HIGH]: '高',
              [TaskPriority.URGENT]: '紧急',
            }[task.priority]}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="创建人">{task.creator.username}</Descriptions.Item>
        <Descriptions.Item label="执行人">
          <Space>
            {task.assignee?.username || '-'}
            <Select
              value={task.assigneeId || undefined}
              onChange={handleAssigneeChange}
              style={{ width: 180 }}
              size="small"
              placeholder="指派给..."
              allowClear
            >
              {teamMembers.map((member) => (
                <Select.Option key={member.user.id} value={member.user.id}>
                  <UserOutlined /> {member.user.username}
                </Select.Option>
              ))}
            </Select>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="所属团队">{task.team?.name}</Descriptions.Item>
        <Descriptions.Item label="开始时间">
          {task.startTime ? dayjs(task.startTime).format('YYYY-MM-DD HH:mm') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="截止时间">
          {task.dueTime ? dayjs(task.dueTime).format('YYYY-MM-DD HH:mm') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="关注人">
          {task.followers?.map((f) => (
            <Tag key={f.id}>{f.user.username}</Tag>
          )) || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="子任务">
          <Space>
            <span>{task.subtasks?.length || 0} 个子任务</span>
            <Button
              type="link"
              icon={<PlusOutlined />}
              onClick={() => setIsSubtaskModalVisible(true)}
              size="small"
            >
              添加子任务
            </Button>
          </Space>
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      {task.subtasks && task.subtasks.length > 0 && (
        <>
          <h3>子任务列表</h3>
          <List
            dataSource={task.subtasks}
            renderItem={(subtask) => (
              <List.Item>
                <Card 
                  size="small" 
                  style={{ width: '100%' }}
                  extra={
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteSubtask(subtask.id, subtask.title)}
                    >
                      删除
                    </Button>
                  }
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <strong>{subtask.title}</strong>
                      <Tag
                        color={subtask.priority === TaskPriority.URGENT ? 'red' : 'blue'}
                        style={{ marginLeft: 8 }}
                      >
                        {{
                          [TaskPriority.LOW]: '低',
                          [TaskPriority.MEDIUM]: '中',
                          [TaskPriority.HIGH]: '高',
                          [TaskPriority.URGENT]: '紧急',
                        }[subtask.priority]}
                      </Tag>
                    </div>
                    {subtask.description && <div style={{ color: '#666' }}>{subtask.description}</div>}
                    <Space>
                      <span>状态:</span>
                      <Select
                        value={subtask.status}
                        onChange={(value) => handleSubtaskStatusChange(subtask.id, value)}
                        style={{ width: 120 }}
                        size="small"
                      >
                        <Option value={TaskStatus.PENDING}>待处理</Option>
                        <Option value={TaskStatus.IN_PROGRESS}>进行中</Option>
                        <Option value={TaskStatus.COMPLETED}>已完成</Option>
                        <Option value={TaskStatus.CANCELLED}>已取消</Option>
                      </Select>
                    </Space>
                    {subtask.assignee && (
                      <div style={{ fontSize: '14px' }}>
                        <UserOutlined /> 执行人: {subtask.assignee.username}
                      </div>
                    )}
                    {(subtask.startTime || subtask.dueTime) && (
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {subtask.startTime && (
                          <span>开始: {dayjs(subtask.startTime).format('YYYY-MM-DD HH:mm')}</span>
                        )}
                        {subtask.startTime && subtask.dueTime && <span> | </span>}
                        {subtask.dueTime && (
                          <span>截止: {dayjs(subtask.dueTime).format('YYYY-MM-DD HH:mm')}</span>
                        )}
                      </div>
                    )}
                  </Space>
                </Card>
              </List.Item>
            )}
          />
          <Divider />
        </>
      )}

      <h3 style={{ marginTop: 24 }}>添加评论</h3>
      <Form form={commentForm} onFinish={handleAddComment} style={{ marginTop: 16 }}>
        <Form.Item
          name="comment"
          rules={[{ required: true, message: '请输入评论内容' }]}
        >
          <TextArea rows={3} placeholder="请输入评论内容..." />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            发表评论
          </Button>
        </Form.Item>
      </Form>

      <Divider style={{ marginTop: 24 }} />

      <h3 style={{ marginBottom: 16 }}>历史记录</h3>
      <Timeline
        items={history.map((item) => {
          const actionTypeMap: { [key: string]: string } = {
            'CREATED': '创建',
            'UPDATED': '更新',
            'STATUS_CHANGED': '状态变更',
            'ASSIGNEE_CHANGED': '执行人变更',
            'COMPLETED': '完成',
            'COMMENT': '评论',
          };
          
          const isSubtask = item.task && item.taskId !== task.id;
          
          return {
            children: (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8 }}>
                  <strong style={{ fontSize: 14 }}>{item.user.username}</strong>
                  <span style={{ color: '#666', marginLeft: 8 }}>
                    {actionTypeMap[item.actionType] || item.actionType}
                  </span>
                  {isSubtask && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      子任务: {item.task?.title}
                    </Tag>
                  )}
                </div>
              {item.comment && (
                <div
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                    padding: '8px 12px',
                    background: '#f5f5f5',
                    borderRadius: 4,
                    fontSize: 14,
                    lineHeight: '1.6',
                  }}
                >
                  {item.comment}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
                {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </div>
            </div>
          ),
        };
        })}
      />

      <Modal
        title="创建子任务"
        open={isSubtaskModalVisible}
        onCancel={() => {
          setIsSubtaskModalVisible(false);
          subtaskForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={subtaskForm} layout="vertical" onFinish={handleCreateSubtask}>
          <Form.Item
            name="title"
            label="子任务标题"
            rules={[{ required: true, message: '请输入子任务标题' }]}
          >
            <Input placeholder="请输入子任务标题" />
          </Form.Item>

          <Form.Item name="description" label="子任务描述">
            <Input.TextArea rows={3} placeholder="请输入子任务描述（可选）" />
          </Form.Item>

          <Form.Item name="assigneeId" label="指派执行人">
            <Select placeholder="选择执行人（可选）" allowClear>
              {teamMembers.map((member) => (
                <Select.Option key={member.user.id} value={member.user.id}>
                  {member.user.username}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="priority" label="优先级" initialValue={TaskPriority.MEDIUM}>
            <Select>
              <Select.Option value={TaskPriority.LOW}>低</Select.Option>
              <Select.Option value={TaskPriority.MEDIUM}>中</Select.Option>
              <Select.Option value={TaskPriority.HIGH}>高</Select.Option>
              <Select.Option value={TaskPriority.URGENT}>紧急</Select.Option>
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
              <Button type="primary" htmlType="submit" loading={loading}>
                创建子任务
              </Button>
              <Button onClick={() => setIsSubtaskModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskDetail;
