import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';
export class CreateSalaryWithdrawalDto extends PaymentAccountSelectionDto {
  @IsNumber() @IsPositive() amount: number;
  @IsDateString() withdrawalDate: string;
  @IsEnum(['cash', 'bank']) paymentMethod: 'cash' | 'bank';
  @IsOptional() @IsString() @MaxLength(255) notes?: string;
}
