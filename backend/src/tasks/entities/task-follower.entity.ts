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

@Entity('task_followers')
export class TaskFollower {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'task_id' })
  taskId: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @ManyToOne(() => Task, (task) => task.followers)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'followed_at' })
  followedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
