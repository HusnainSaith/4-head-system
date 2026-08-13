import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PermissionActionEnum } from '../../../common/enums/permission-actions.enum';

export enum AssignmentActionEnum {
  ADD = 'add',
  REMOVE = 'remove',
  REPLACE = 'replace',
}

export class AssignPermissionsDto {
  @ApiProperty({
    description: 'Feature name (e.g., users, projects, tasks, client-notes)',
    example: 'users',
    type: String,
  })
  @IsString({ message: 'Feature must be a string' })
  @IsNotEmpty({ message: 'Feature is required' })
  feature: string;
  //
  @ApiProperty({
    description: 'Actions to assign for this feature',
    enum: PermissionActionEnum,
    isArray: true,
    example: [
      PermissionActionEnum.CREATE,
      PermissionActionEnum.READ,
      PermissionActionEnum.UPDATE,
      PermissionActionEnum.DELETE,
    ],
  })
  @IsArray({ message: 'Actions must be an array' })
  @IsEnum(PermissionActionEnum, {
    each: true,
    message: 'Each action must be a valid permission action',
  })
  actions: PermissionActionEnum[];

  @ApiProperty({
    description: 'How to apply these permissions to the user',
    enum: AssignmentActionEnum,
    default: AssignmentActionEnum.ADD,
    required: false,
  })
  @IsOptional()
  @IsEnum(AssignmentActionEnum, {
    message: 'Assignment action must be add, remove, or replace',
  })
  assignmentAction?: AssignmentActionEnum = AssignmentActionEnum.ADD;
}
