import React, { useEffect, useState } from 'react';
import { List, Card, Button, Modal, Form, Input, message, Tag, Select, Drawer, Descriptions } from 'antd';
import { PlusOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons';
import { teamService } from '../services/teamService';
import { Team, TeamRole } from '../types';
import api from '../services/api';

const { TextArea } = Input;

const TeamList: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [inviteForm] = Form.useForm();

  useEffect(() => {
    loadTeams();
    loadAllUsers();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await teamService.getAll();
      setTeams(data);
    } catch (error) {
      message.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await api.get('/users');
      setAllUsers(response.data);
    } catch (error) {
      console.error('Failed to load users');
    }
  };

  const handleCreate = async (values: { name: string; description?: string }) => {
    try {
      await teamService.create(values.name, values.description);
      message.success('Team created successfully');
      setIsModalVisible(false);
      form.resetFields();
      loadTeams();
    } catch (error) {
      message.error('Failed to create team');
    }
  };

  const handleInviteMember = async (values: { userId: string; role: TeamRole }) => {
    if (!selectedTeam) return;

    try {
      await teamService.addMember(selectedTeam.id, values.userId, values.role);
      message.success('Member invited successfully');
      setIsInviteModalVisible(false);
      inviteForm.resetFields();
      loadTeams();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to invite member');
    }
  };

  const openInviteModal = (team: Team) => {
    setSelectedTeam(team);
    setIsInviteModalVisible(true);
  };

  const getRoleColor = (role: TeamRole) => {
    const colors = {
      owner: 'gold',
      admin: 'blue',
      member: 'default',
    };
    return colors[role];
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>Teams</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          New Team
        </Button>
      </div>

      <List
        grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
        dataSource={teams}
        loading={loading}
        renderItem={(team) => (
          <List.Item>
            <Card
              title={
                <div>
                  <TeamOutlined style={{ marginRight: 8 }} />
                  {team.name}
                </div>
              }
              extra={
                team.userRole && <Tag color={getRoleColor(team.userRole)}>{team.userRole}</Tag>
              }
              actions={
                (team.userRole === TeamRole.OWNER || team.userRole === TeamRole.ADMIN)
                  ? [
                      <Button
                        type="link"
                        icon={<UserAddOutlined />}
                        onClick={() => openInviteModal(team)}
                      >
                        Invite
                      </Button>,
                    ]
                  : []
              }
            >
              <p>{team.description || 'No description'}</p>
              <p style={{ fontSize: 12, color: '#999' }}>
                Members: {team.members?.length || 0}
              </p>
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title="Create New Team"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="name"
            label="Team Name"
            rules={[{ required: true, message: 'Please input team name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Create
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Invite Member to ${selectedTeam?.name}`}
        open={isInviteModalVisible}
        onCancel={() => {
          setIsInviteModalVisible(false);
          inviteForm.resetFields();
        }}
        footer={null}
      >
        <Form form={inviteForm} layout="vertical" onFinish={handleInviteMember}>
          <Form.Item
            name="userId"
            label="Select User"
            rules={[{ required: true, message: 'Please select a user' }]}
          >
            <Select
              placeholder="Select user to invite"
              showSearch
              filterOption={(input, option: any) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {allUsers
                .filter(user => !selectedTeam?.members?.some(m => m.userId === user.id))
                .map((user) => (
                  <Select.Option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            initialValue={TeamRole.MEMBER}
          >
            <Select>
              <Select.Option value={TeamRole.MEMBER}>Member</Select.Option>
              <Select.Option value={TeamRole.ADMIN}>Admin</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Invite
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeamList;
