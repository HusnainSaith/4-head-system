import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum CashAdjustmentType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
}

export class CashAdjustmentDto {
  @IsEnum(CashAdjustmentType)
  type: CashAdjustmentType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
