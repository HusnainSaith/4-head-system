import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';

export class RunPayrollDto extends PaymentAccountSelectionDto {
  @IsUUID()
  employeeId: string;

  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth: number;

  @IsInt()
  @Min(2000)
  @Max(9999)
  periodYear: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  manualDeduction?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deductionReason?: string;

  @IsOptional()
  @IsBoolean()
  recoverAdvances?: boolean;

  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @IsOptional()
  @IsEnum(['cash', 'bank'])
  paymentMethod?: 'cash' | 'bank';
}
