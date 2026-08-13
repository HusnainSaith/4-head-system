// DTO for creating user with permissions
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserWithPermissionsDto {
  @ApiProperty({
    description: 'User email address',
    example: 'jane.doe@example.com',
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: 'Password of the user',
    example: 'StrongPass123!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'Jane Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Full name must be a string' })
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z\s]+$/, {
    message: 'Full name can only contain letters and spaces',
  })
  @Transform(({ value }) => value?.trim())
  fullName: string;

  @ApiPropertyOptional({
    description: 'Role ID associated with the user (UUID v4)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Role ID must be a valid UUID' })
  roleId?: string;

  @ApiPropertyOptional({
    description: 'List of permission IDs (array of UUID v4)',
    example: [
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
    ],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', {
    each: true,
    message: 'Each permission ID must be a valid UUID',
  })
  permissionIds?: string[];
}
