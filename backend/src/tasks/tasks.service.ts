import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task, TaskStatus } from './entities/task.entity';
import { TaskFollower } from './entities/task-follower.entity';
import { TaskHistory, TaskHistoryActionType } from './entities/task-history.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { AddCommentDto } from './dto/add-comment.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(TaskFollower)
    private taskFollowersRepository: Repository<TaskFollower>,
    @InjectRepository(TaskHistory)
    private taskHistoryRepository: Repository<TaskHistory>,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string) {
    const task = this.tasksRepository.create({
      ...createTaskDto,
      creatorId: userId,
    });

    const savedTask = await this.tasksRepository.save(task);

    // Create history record
    await this.createHistory({
      taskId: savedTask.id,
      userId,
      actionType: TaskHistoryActionType.CREATED,
      changes: { task: savedTask },
    });

    // Add followers if provided
    if (createTaskDto.followerIds && createTaskDto.followerIds.length > 0) {
      await this.addFollowers(savedTask.id, createTaskDto.followerIds, userId);
    }

    return this.findOne(savedTask.id, userId);
  }

  async findAll(userId: string, filterDto?: FilterTasksDto) {
    const queryBuilder = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.team', 'team')
      .leftJoinAndSelect('task.followers', 'followers')
      .leftJoinAndSelect('followers.user', 'followerUser')
      .leftJoinAndSelect('task.subtasks', 'subtasks')
      .where(
        '(task.creatorId = :userId OR task.assigneeId = :userId OR followers.userId = :userId)',
        { userId },
      );

    // Apply filters
    if (filterDto) {
      if (filterDto.teamId) {
        queryBuilder.andWhere('task.teamId = :teamId', {
          teamId: filterDto.teamId,
        });
      }

      if (filterDto.status) {
        queryBuilder.andWhere('task.status = :status', {
          status: filterDto.status,
        });
      }

      if (filterDto.creatorId) {
        queryBuilder.andWhere('task.creatorId = :creatorId', {
          creatorId: filterDto.creatorId,
        });
      }

      if (filterDto.assigneeId) {
        queryBuilder.andWhere('task.assigneeId = :assigneeId', {
          assigneeId: filterDto.assigneeId,
        });
      }

      if (filterDto.startDate && filterDto.endDate) {
        queryBuilder.andWhere('task.createdAt BETWEEN :startDate AND :endDate', {
          startDate: filterDto.startDate,
          endDate: filterDto.endDate,
        });
      }

      // Apply sorting
      const sortField = filterDto.sortBy || 'createdAt';
      const sortOrder = filterDto.sortOrder || 'DESC';
      queryBuilder.orderBy(`task.${sortField}`, sortOrder);
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string, userId: string) {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: [
        'creator',
        'assignee',
        'team',
        'followers',
        'followers.user',
        'subtasks',
        'subtasks.assignee',
        'parentTask',
      ],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user has access (creator, assignee, or follower)
    const hasAccess =
      task.creatorId === userId ||
      task.assigneeId === userId ||
      task.followers.some((f) => f.userId === userId);

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    const task = await this.findOne(id, userId);

    const oldValues = { ...task };
    Object.assign(task, updateTaskDto);

    // If status changed to completed, set completedAt
    if (
      updateTaskDto.status === TaskStatus.COMPLETED &&
      task.status !== TaskStatus.COMPLETED
    ) {
      task.completedAt = new Date();

      // Check and auto-complete parent task if all subtasks are completed
      if (task.parentTaskId) {
        await this.checkAndCompleteParentTask(task.parentTaskId);
      }
    }

    const updatedTask = await this.tasksRepository.save(task);

    // Create history record
    await this.createHistory({
      taskId: id,
      userId,
      actionType: TaskHistoryActionType.UPDATED,
      changes: {
        old: oldValues,
        new: updatedTask,
      },
    });

    // If assignee changed, create specific history
    if (updateTaskDto.assigneeId && updateTaskDto.assigneeId !== oldValues.assigneeId) {
      await this.createHistory({
        taskId: id,
        userId,
        actionType: TaskHistoryActionType.ASSIGNEE_CHANGED,
        changes: {
          oldAssigneeId: oldValues.assigneeId,
          newAssigneeId: updateTaskDto.assigneeId,
        },
      });
    }

    // If status changed, create specific history
    if (updateTaskDto.status && updateTaskDto.status !== oldValues.status) {
      await this.createHistory({
        taskId: id,
        userId,
        actionType: TaskHistoryActionType.STATUS_CHANGED,
        changes: {
          oldStatus: oldValues.status,
          newStatus: updateTaskDto.status,
        },
      });
    }

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    const task = await this.findOne(id, userId);

    if (task.creatorId !== userId) {
      throw new ForbiddenException('Only creator can delete the task');
    }

    await this.tasksRepository.remove(task);
    return { message: 'Task deleted successfully' };
  }

  async addFollowers(taskId: string, userIds: string[], currentUserId: string) {
    const task = await this.findOne(taskId, currentUserId);

    const followers = userIds.map((userId) =>
      this.taskFollowersRepository.create({
        taskId,
        userId,
      }),
    );

    await this.taskFollowersRepository.save(followers);

    // Create history for each follower
    for (const userId of userIds) {
      await this.createHistory({
        taskId,
        userId: currentUserId,
        actionType: TaskHistoryActionType.FOLLOWER_ADDED,
        changes: { followerId: userId },
      });
    }

    return this.findOne(taskId, currentUserId);
  }

  async removeFollower(taskId: string, followerId: string, currentUserId: string) {
    await this.findOne(taskId, currentUserId);

    const follower = await this.taskFollowersRepository.findOne({
      where: { taskId, userId: followerId },
    });

    if (!follower) {
      throw new NotFoundException('Follower not found');
    }

    await this.taskFollowersRepository.remove(follower);
    return { message: 'Follower removed successfully' };
  }

  async getHistory(taskId: string, userId: string) {
    await this.findOne(taskId, userId);

    return this.taskHistoryRepository.find({
      where: { taskId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async addComment(taskId: string, addCommentDto: AddCommentDto, userId: string) {
    await this.findOne(taskId, userId);

    await this.createHistory({
      taskId,
      userId,
      actionType: TaskHistoryActionType.COMMENT,
      comment: addCommentDto.comment,
    });

    return this.getHistory(taskId, userId);
  }

  private async createHistory(data: {
    taskId: string;
    userId: string;
    actionType: TaskHistoryActionType;
    changes?: any;
    comment?: string;
  }) {
    const history = this.taskHistoryRepository.create(data);
    return this.taskHistoryRepository.save(history);
  }

  private async checkAndCompleteParentTask(parentTaskId: string) {
    const parentTask = await this.tasksRepository.findOne({
      where: { id: parentTaskId },
      relations: ['subtasks'],
    });

    if (!parentTask) return;

    // Check if all subtasks are completed
    const allCompleted = parentTask.subtasks.every(
      (subtask) => subtask.status === TaskStatus.COMPLETED,
    );

    if (allCompleted && parentTask.status !== TaskStatus.COMPLETED) {
      parentTask.status = TaskStatus.COMPLETED;
      parentTask.completedAt = new Date();
      await this.tasksRepository.save(parentTask);

      await this.createHistory({
        taskId: parentTaskId,
        userId: parentTask.creatorId,
        actionType: TaskHistoryActionType.COMPLETED,
        changes: { autoCompleted: true, reason: 'All subtasks completed' },
      });
    }
  }
}
