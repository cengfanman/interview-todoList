import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { TeamRole } from '../entities/team-member.entity';

export class AddMemberDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: TeamRole, example: TeamRole.MEMBER, required: false })
  @IsOptional()
  @IsEnum(TeamRole)
  role?: TeamRole;
}
