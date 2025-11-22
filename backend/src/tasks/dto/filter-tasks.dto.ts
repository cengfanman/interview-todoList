import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { TaskStatus } from '../entities/task.entity';

export class FilterTasksDto {
  @ApiProperty({ required: false })
  @IsOptional()
  teamId?: string;

  @ApiProperty({ enum: TaskStatus, required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  creatorId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  assigneeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @ApiProperty({
    example: 'createdAt',
    required: false,
    description: 'Sort field: createdAt, dueTime, creatorId, id',
  })
  @IsOptional()
  sortBy?: string;

  @ApiProperty({
    example: 'DESC',
    required: false,
    description: 'Sort order: ASC or DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
