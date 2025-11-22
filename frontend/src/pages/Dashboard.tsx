import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CheckSquareOutlined,
  LogoutOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import TaskList from '../components/TaskList';
import TeamList from '../components/TeamList';
import './Dashboard.css';

const { Header, Sider, Content } = Layout;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [selectedView, setSelectedView] = useState('my-tasks');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    {
      key: 'my-tasks',
      icon: <CheckSquareOutlined />,
      label: 'My Tasks',
      onClick: () => {
        setSelectedView('my-tasks');
        navigate('/');
      },
    },
    {
      key: 'teams',
      icon: <TeamOutlined />,
      label: 'Teams',
      onClick: () => {
        setSelectedView('teams');
        navigate('/teams');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="light">
        <div className="logo">
          <CheckSquareOutlined style={{ fontSize: 24, marginRight: 8 }} />
          <span>TodoList</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedView]}
          items={menuItems}
          style={{ height: '100%', borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header className="header">
          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="user-info">
                <Avatar icon={<UserOutlined />} />
                <span>{user?.username}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="content">
          <Routes>
            <Route path="/" element={<TaskList />} />
            <Route path="/teams" element={<TeamList />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Dashboard;
