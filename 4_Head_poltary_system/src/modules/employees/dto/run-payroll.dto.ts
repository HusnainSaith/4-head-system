import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsUUID,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';

export class RunPayrollDto extends PaymentAccountSelectionDto {
  @IsUUID()
  employeeId: string;

  @IsNumber()
  periodMonth: number;

  @IsNumber()
  periodYear: number;

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
