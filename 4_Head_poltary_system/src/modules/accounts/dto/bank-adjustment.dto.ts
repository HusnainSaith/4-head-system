import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { CashAdjustmentType } from './cash-adjustment.dto';

export class BankAdjustmentDto {
  @IsEnum(CashAdjustmentType)
  type: CashAdjustmentType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ValidateIf((value) => value.type === CashAdjustmentType.DEPOSIT)
  @IsUUID()
  cashAccountId?: string;

  @IsIn(['cheque', 'app'])
  bankTransactionMethod: 'cheque' | 'app';

  @ValidateIf((value) => value.bankTransactionMethod === 'cheque')
  @IsString()
  chequeNumber?: string;

  @IsOptional()
  @IsString()
  appReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
