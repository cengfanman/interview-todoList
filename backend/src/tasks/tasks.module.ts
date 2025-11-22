import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { TaskFollower } from './entities/task-follower.entity';
import { TaskHistory } from './entities/task-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskFollower, TaskHistory])],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
