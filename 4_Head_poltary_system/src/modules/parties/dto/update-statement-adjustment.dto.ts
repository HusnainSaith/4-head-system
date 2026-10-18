import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateStatementAdjustmentDto {
  @IsDateString() date: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount: number;
  @IsIn(['debit', 'credit']) entryType: 'debit' | 'credit';
  @IsOptional() @IsString() @MaxLength(255) notes?: string;
}
