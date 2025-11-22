import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Task } from './task.entity';
import { User } from '../../users/entities/user.entity';

export enum TaskHistoryActionType {
  CREATED = 'created',
  UPDATED = 'updated',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  COMMENT = 'comment',
  ASSIGNEE_CHANGED = 'assignee_changed',
  STATUS_CHANGED = 'status_changed',
  FOLLOWER_ADDED = 'follower_added',
}

@Entity('task_history')
export class TaskHistory {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'task_id' })
  taskId: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: TaskHistoryActionType,
    name: 'action_type',
  })
  actionType: TaskHistoryActionType;

  @Column({ type: 'json', nullable: true })
  changes?: any;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @ManyToOne(() => Task, (task) => task.history)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
