import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Teams')
@Controller('teams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new team' })
  async create(@Body() createTeamDto: CreateTeamDto, @CurrentUser() user: any) {
    return this.teamsService.create(createTeamDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teams for current user' })
  async findAll(@CurrentUser() user: any) {
    return this.teamsService.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by id' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.teamsService.findOne(id, user.userId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to team' })
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
    @CurrentUser() user: any,
  ) {
    return this.teamsService.addMember(id, addMemberDto, user.userId);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from team' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
    @CurrentUser() user: any,
  ) {
    return this.teamsService.removeMember(id, memberUserId, user.userId);
  }
}
