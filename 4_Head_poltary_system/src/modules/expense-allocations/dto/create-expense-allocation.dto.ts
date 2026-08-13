import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AllocationSplitDto {
  @IsUUID() departmentId: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  percentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() amount?: number;
}
export class CreateExpenseAllocationDto {
  @IsUUID() categoryId: string;
  @Type(() => Number) @IsNumber() @IsPositive() totalAmount: number;
  @IsEnum(['equal', 'percentage', 'manual']) allocationMethod:
    'equal' | 'percentage' | 'manual';
  @IsDateString() expenseDate: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AllocationSplitDto)
  splits: AllocationSplitDto[];
}
