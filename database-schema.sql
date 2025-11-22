-- ============================================
-- TodoList Application Database Schema
-- Database: MySQL 8.0+
-- ============================================

-- Users Table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teams Table
CREATE TABLE teams (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Team Members Table (多对多关系)
CREATE TABLE team_members (
    id VARCHAR(36) PRIMARY KEY,
    team_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('owner', 'admin', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_team_user (team_id, user_id),
    INDEX idx_team_id (team_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks Table
CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',

    -- 任务所属
    team_id VARCHAR(36) NOT NULL,
    parent_task_id VARCHAR(36) NULL, -- 子任务关联

    -- 人员相关
    creator_id VARCHAR(36) NOT NULL,
    assignee_id VARCHAR(36), -- 执行人

    -- 时间相关
    start_time TIMESTAMP NULL,
    due_time TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_team_id (team_id),
    INDEX idx_creator_id (creator_id),
    INDEX idx_assignee_id (assignee_id),
    INDEX idx_parent_task_id (parent_task_id),
    INDEX idx_status (status),
    INDEX idx_due_time (due_time),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Task Followers Table (关注人，多对多)
CREATE TABLE task_followers (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_follower (task_id, user_id),
    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Task History Table (任务历史记录)
CREATE TABLE task_history (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    action_type ENUM('created', 'updated', 'completed', 'cancelled', 'comment', 'assignee_changed', 'status_changed', 'follower_added') NOT NULL,

    -- 变更详情 (JSON格式存储)
    changes JSON,

    -- 评论内容
    comment TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 以下为需要文字规划的功能的 Schema
-- ============================================

-- Notifications Table (消息提醒任务即将到期)
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    task_id VARCHAR(36) NOT NULL,
    notification_type ENUM('task_due_soon', 'task_assigned', 'task_completed', 'new_comment', 'follower_added') NOT NULL,

    title VARCHAR(500) NOT NULL,
    content TEXT,

    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,

    -- 提醒时间
    scheduled_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,

    INDEX idx_user_id (user_id),
    INDEX idx_task_id (task_id),
    INDEX idx_is_read (is_read),
    INDEX idx_scheduled_at (scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recurring Tasks Table (定时重复任务)
CREATE TABLE recurring_tasks (
    id VARCHAR(36) PRIMARY KEY,
    task_template_id VARCHAR(36) NOT NULL, -- 关联到原始任务模板

    -- 重复规则
    recurrence_type ENUM('daily', 'weekly', 'monthly', 'yearly', 'custom') NOT NULL,
    recurrence_pattern JSON, -- 存储复杂的重复规则，如：{"interval": 2, "unit": "weeks", "daysOfWeek": [1,3,5]}

    -- 时间范围
    start_date DATE NOT NULL,
    end_date DATE NULL, -- NULL表示无限重复

    -- 状态
    is_active BOOLEAN DEFAULT TRUE,

    -- 最后生成的任务
    last_generated_at TIMESTAMP NULL,
    next_generation_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (task_template_id) REFERENCES tasks(id) ON DELETE CASCADE,

    INDEX idx_task_template_id (task_template_id),
    INDEX idx_next_generation_at (next_generation_at),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Generated Tasks from Recurring (记录由重复任务生成的实际任务)
CREATE TABLE generated_tasks (
    id VARCHAR(36) PRIMARY KEY,
    recurring_task_id VARCHAR(36) NOT NULL,
    task_id VARCHAR(36) NOT NULL,
    generation_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recurring_task_id) REFERENCES recurring_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,

    INDEX idx_recurring_task_id (recurring_task_id),
    INDEX idx_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
