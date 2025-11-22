import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { AddFollowersDto } from './dto/add-followers.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  async create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() user: any) {
    return this.tasksService.create(createTaskDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks for current user with filters' })
  async findAll(@Query() filterDto: FilterTasksDto, @CurrentUser() user: any) {
    return this.tasksService.findAll(user.userId, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by id' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.update(id, updateTaskDto, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.remove(id, user.userId);
  }

  @Post(':id/followers')
  @ApiOperation({ summary: 'Add followers to task' })
  async addFollowers(
    @Param('id') id: string,
    @Body() addFollowersDto: AddFollowersDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.addFollowers(
      id,
      addFollowersDto.userIds,
      user.userId,
    );
  }

  @Delete(':id/followers/:userId')
  @ApiOperation({ summary: 'Remove follower from task' })
  async removeFollower(
    @Param('id') id: string,
    @Param('userId') followerId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.removeFollower(id, followerId, user.userId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get task history' })
  async getHistory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.getHistory(id, user.userId);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to task' })
  async addComment(
    @Param('id') id: string,
    @Body() addCommentDto: AddCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.addComment(id, addCommentDto, user.userId);
  }
}
