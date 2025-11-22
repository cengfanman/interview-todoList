import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
  IsArray,
  IsDateString,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement user authentication' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Implement JWT-based authentication for the API',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.PENDING, required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.HIGH, required: false })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ example: 'team-uuid' })
  @IsNotEmpty()
  teamId: string;

  @ApiProperty({ example: 'parent-task-uuid', required: false })
  @IsOptional()
  parentTaskId?: string;

  @ApiProperty({ example: 'user-uuid', required: false })
  @IsOptional()
  assigneeId?: string;

  @ApiProperty({ example: ['user-uuid-1', 'user-uuid-2'], required: false })
  @IsOptional()
  @IsArray()
  followerIds?: string[];

  @ApiProperty({ example: '2025-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  startTime?: Date;

  @ApiProperty({ example: '2025-01-31T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  dueTime?: Date;
}
