import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateAdvanceDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  advanceDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
