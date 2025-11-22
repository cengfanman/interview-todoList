import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';

export class AddFollowersDto {
  @ApiProperty({ example: ['user-uuid-1', 'user-uuid-2'] })
  @IsNotEmpty()
  @IsArray()
  userIds: string[];
}
