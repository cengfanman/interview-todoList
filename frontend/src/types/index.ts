export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  creator: User;
  members: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
  userRole?: TeamRole;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  user: User;
  joinedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  teamId: string;
  team: Team;
  parentTaskId?: string;
  parentTask?: Task;
  subtasks: Task[];
  creatorId: string;
  creator: User;
  assigneeId?: string;
  assignee?: User;
  followers: TaskFollower[];
  startTime?: Date;
  dueTime?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFollower {
  id: string;
  taskId: string;
  userId: string;
  user: User;
  followedAt: Date;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string;
  user: User;
  task?: Task;
  actionType: string;
  changes?: any;
  comment?: string;
  createdAt: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface FilterTasksDto {
  teamId?: string;
  status?: TaskStatus;
  creatorId?: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
