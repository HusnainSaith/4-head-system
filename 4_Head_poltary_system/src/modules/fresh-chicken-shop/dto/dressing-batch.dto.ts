import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDressingBatchDto {
  @IsNumber() @IsPositive() liveWeightKg: number;
  @IsNumber() @IsPositive() dressedWeightKg: number;
  @IsDateString() batchDate: string;
  @IsOptional() @IsString() @MaxLength(255) notes?: string;
}

export class DressingBatchQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
