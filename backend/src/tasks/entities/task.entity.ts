import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../users/entities/user.entity';
import { Team } from '../../teams/entities/team.entity';
import { TaskFollower } from './task-follower.entity';
import { TaskHistory } from './task-history.entity';

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

@Entity('tasks')
export class Task {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: 'varchar', length: 36, name: 'team_id' })
  teamId: string;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'parent_task_id' })
  parentTaskId?: string;

  @Column({ type: 'varchar', length: 36, name: 'creator_id' })
  creatorId: string;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'assignee_id' })
  assigneeId?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'start_time' })
  startTime?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'due_time' })
  dueTime?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt?: Date;

  @ManyToOne(() => Team, (team) => team.tasks)
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @ManyToOne(() => Task, (task) => task.subtasks)
  @JoinColumn({ name: 'parent_task_id' })
  parentTask?: Task;

  @OneToMany(() => Task, (task) => task.parentTask)
  subtasks: Task[];

  @ManyToOne(() => User, (user) => user.createdTasks)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @ManyToOne(() => User, (user) => user.assignedTasks)
  @JoinColumn({ name: 'assignee_id' })
  assignee?: User;

  @OneToMany(() => TaskFollower, (follower) => follower.task)
  followers: TaskFollower[];

  @OneToMany(() => TaskHistory, (history) => history.task)
  history: TaskHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
