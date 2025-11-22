import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMember, TeamRole } from './entities/team-member.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamsRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMembersRepository: Repository<TeamMember>,
  ) {}

  async create(createTeamDto: CreateTeamDto, userId: string) {
    // Create team
    const team = this.teamsRepository.create({
      ...createTeamDto,
      createdBy: userId,
    });
    const savedTeam = await this.teamsRepository.save(team);

    // Add creator as owner
    const teamMember = this.teamMembersRepository.create({
      teamId: savedTeam.id,
      userId: userId,
      role: TeamRole.OWNER,
    });
    await this.teamMembersRepository.save(teamMember);

    return savedTeam;
  }

  async findAll(userId: string) {
    // Find teams where user is a member
    const members = await this.teamMembersRepository.find({
      where: { userId },
      relations: ['team', 'team.creator'],
    });

    return members.map((m) => ({
      ...m.team,
      userRole: m.role,
    }));
  }

  async findOne(id: string, userId: string) {
    const member = await this.teamMembersRepository.findOne({
      where: { teamId: id, userId },
      relations: ['team', 'team.members', 'team.members.user'],
    });

    if (!member) {
      throw new NotFoundException('Team not found or access denied');
    }

    return {
      ...member.team,
      userRole: member.role,
    };
  }

  async addMember(teamId: string, addMemberDto: AddMemberDto, userId: string) {
    // Check if current user is owner or admin
    const currentUserMember = await this.teamMembersRepository.findOne({
      where: { teamId, userId },
    });

    if (
      !currentUserMember ||
      (currentUserMember.role !== TeamRole.OWNER &&
        currentUserMember.role !== TeamRole.ADMIN)
    ) {
      throw new ForbiddenException('Only owners and admins can add members');
    }

    // Check if user is already a member
    const existingMember = await this.teamMembersRepository.findOne({
      where: { teamId, userId: addMemberDto.userId },
    });

    if (existingMember) {
      throw new ForbiddenException('User is already a member');
    }

    // Add new member
    const member = this.teamMembersRepository.create({
      teamId,
      userId: addMemberDto.userId,
      role: addMemberDto.role || TeamRole.MEMBER,
    });

    return this.teamMembersRepository.save(member);
  }

  async removeMember(teamId: string, memberUserId: string, userId: string) {
    // Check if current user is owner or admin
    const currentUserMember = await this.teamMembersRepository.findOne({
      where: { teamId, userId },
    });

    if (
      !currentUserMember ||
      (currentUserMember.role !== TeamRole.OWNER &&
        currentUserMember.role !== TeamRole.ADMIN)
    ) {
      throw new ForbiddenException('Only owners and admins can remove members');
    }

    const memberToRemove = await this.teamMembersRepository.findOne({
      where: { teamId, userId: memberUserId },
    });

    if (!memberToRemove) {
      throw new NotFoundException('Member not found');
    }

    if (memberToRemove.role === TeamRole.OWNER) {
      throw new ForbiddenException('Cannot remove team owner');
    }

    await this.teamMembersRepository.remove(memberToRemove);
    return { message: 'Member removed successfully' };
  }
}
