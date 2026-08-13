import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateBonusDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  bonusDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
