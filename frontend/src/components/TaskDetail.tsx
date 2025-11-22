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
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
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
      message.success('Comment added');
      commentForm.resetFields();
      loadHistory();
    } catch (error) {
      message.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Descriptions column={1} bordered>
        <Descriptions.Item label="Title">{task.title}</Descriptions.Item>
        <Descriptions.Item label="Description">
          {task.description || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Space>
            <Tag color={task.status === TaskStatus.COMPLETED ? 'success' : 'processing'}>
              {task.status.replace('_', ' ').toUpperCase()}
            </Tag>
            <Select
              value={task.status}
              onChange={handleStatusChange}
              style={{ width: 150 }}
              size="small"
            >
              <Option value={TaskStatus.PENDING}>Pending</Option>
              <Option value={TaskStatus.IN_PROGRESS}>In Progress</Option>
              <Option value={TaskStatus.COMPLETED}>Completed</Option>
              <Option value={TaskStatus.CANCELLED}>Cancelled</Option>
            </Select>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Priority">
          <Tag color={task.priority === TaskPriority.URGENT ? 'red' : 'blue'}>
            {task.priority.toUpperCase()}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Creator">{task.creator.username}</Descriptions.Item>
        <Descriptions.Item label="Assignee">
          <Space>
            {task.assignee?.username || '-'}
            <Select
              value={task.assigneeId || undefined}
              onChange={handleAssigneeChange}
              style={{ width: 200 }}
              size="small"
              placeholder="Assign to..."
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
        <Descriptions.Item label="Team">{task.team?.name}</Descriptions.Item>
        <Descriptions.Item label="Start Time">
          {task.startTime ? dayjs(task.startTime).format('YYYY-MM-DD HH:mm') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Due Time">
          {task.dueTime ? dayjs(task.dueTime).format('YYYY-MM-DD HH:mm') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Followers">
          {task.followers?.map((f) => (
            <Tag key={f.id}>{f.user.username}</Tag>
          )) || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Subtasks">
          <Space>
            <span>{task.subtasks?.length || 0} subtasks</span>
            <Button
              type="link"
              icon={<PlusOutlined />}
              onClick={() => setIsSubtaskModalVisible(true)}
              size="small"
            >
              Add Subtask
            </Button>
          </Space>
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      {task.subtasks && task.subtasks.length > 0 && (
        <>
          <h3>Subtasks</h3>
          <List
            dataSource={task.subtasks}
            renderItem={(subtask) => (
              <List.Item>
                <Card size="small" style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <strong>{subtask.title}</strong>
                      <Tag
                        color={
                          subtask.status === TaskStatus.COMPLETED ? 'success' : 'processing'
                        }
                        style={{ marginLeft: 8 }}
                      >
                        {subtask.status}
                      </Tag>
                      <Tag
                        color={subtask.priority === TaskPriority.URGENT ? 'red' : 'blue'}
                        style={{ marginLeft: 4 }}
                      >
                        {subtask.priority}
                      </Tag>
                    </div>
                    {subtask.description && <div>{subtask.description}</div>}
                    {subtask.assignee && (
                      <div>
                        <UserOutlined /> Assignee: {subtask.assignee.username}
                      </div>
                    )}
                    {(subtask.startTime || subtask.dueTime) && (
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {subtask.startTime && (
                          <span>Start: {dayjs(subtask.startTime).format('YYYY-MM-DD HH:mm')}</span>
                        )}
                        {subtask.startTime && subtask.dueTime && <span> | </span>}
                        {subtask.dueTime && (
                          <span>Due: {dayjs(subtask.dueTime).format('YYYY-MM-DD HH:mm')}</span>
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

      <h3>Add Comment</h3>
      <Form form={commentForm} onFinish={handleAddComment}>
        <Form.Item
          name="comment"
          rules={[{ required: true, message: 'Please enter a comment' }]}
        >
          <TextArea rows={3} placeholder="Enter your comment..." />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Add Comment
          </Button>
        </Form.Item>
      </Form>

      <Divider />

      <h3>History</h3>
      <Timeline
        items={history.map((item) => ({
          children: (
            <div>
              <div>
                <strong>{item.user.username}</strong> - {item.actionType.replace('_', ' ')}
              </div>
              {item.comment && <div style={{ marginTop: 8 }}>{item.comment}</div>}
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </div>
            </div>
          ),
        }))}
      />

      <Modal
        title="Create Subtask"
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
            label="Subtask Title"
            rules={[{ required: true, message: 'Please input subtask title' }]}
          >
            <Input placeholder="Enter subtask title" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Enter description (optional)" />
          </Form.Item>

          <Form.Item name="assigneeId" label="Assign To">
            <Select placeholder="Select assignee (optional)" allowClear>
              {teamMembers.map((member) => (
                <Select.Option key={member.user.id} value={member.user.id}>
                  {member.user.username}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="priority" label="Priority" initialValue={TaskPriority.MEDIUM}>
            <Select>
              <Select.Option value={TaskPriority.LOW}>Low</Select.Option>
              <Select.Option value={TaskPriority.MEDIUM}>Medium</Select.Option>
              <Select.Option value={TaskPriority.HIGH}>High</Select.Option>
              <Select.Option value={TaskPriority.URGENT}>Urgent</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="startTime" label="Start Time">
            <DatePicker showTime style={{ width: '100%' }} placeholder="Select start time (optional)" />
          </Form.Item>

          <Form.Item name="dueTime" label="Due Time">
            <DatePicker showTime style={{ width: '100%' }} placeholder="Select due time (optional)" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Create Subtask
              </Button>
              <Button onClick={() => setIsSubtaskModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskDetail;
