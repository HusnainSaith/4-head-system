import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateBonusDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsDateString()
  bonusDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
