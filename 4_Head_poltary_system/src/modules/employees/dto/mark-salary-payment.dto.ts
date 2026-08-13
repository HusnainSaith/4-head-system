import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';

export class MarkSalaryPaymentDto extends PaymentAccountSelectionDto {
  @IsDateString()
  paidDate: string;

  @IsEnum(['cash', 'bank'])
  paymentMethod: 'cash' | 'bank';

  @IsOptional() @IsNumber() @IsPositive() amount?: number;
}
