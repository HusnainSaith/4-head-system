import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/, {
    message: 'Role name may contain letters, numbers, and underscores only',
  })
  @Transform(({ value }) => String(value).trim().toUpperCase())
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
