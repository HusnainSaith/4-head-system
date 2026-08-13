import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({
    description:
      'Password (must contain at least 1 uppercase, 1 lowercase, and 1 number)',
    example: 'StrongPass123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
  })
  password: string;

  @ApiProperty({
    description:
      'Full name of the user (letters and numbers; common name punctuation is allowed)',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Full name must be a string' })
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  @Matches(/^[\p{L}\p{M}\p{N}]+(?:[ '\u2019.-][\p{L}\p{M}\p{N}]+)*$/u, {
    message: 'Full name contains unsupported characters',
  })
  fullName: string;

  @ApiPropertyOptional({
    description: 'Role ID (must be a valid UUID v4)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Role ID must be a valid UUID' })
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+92-300-1234567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
