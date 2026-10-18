import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateExpenseCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn([
    'operational',
    'maintenance',
    'transport',
    'administrative',
    'miscellaneous',
  ])
  categoryType?:
    | 'operational'
    | 'maintenance'
    | 'transport'
    | 'administrative'
    | 'miscellaneous';
}
