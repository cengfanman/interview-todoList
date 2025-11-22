import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Development Team' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Team for product development', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
