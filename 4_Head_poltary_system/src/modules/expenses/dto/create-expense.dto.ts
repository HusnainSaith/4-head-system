import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumberString,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';

export class CreateExpenseDto extends PaymentAccountSelectionDto {
  @IsUUID()
  departmentId: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNumberString()
  amount: string;

  @IsDateString()
  expenseDate: string;

  @IsEnum(['cash', 'bank'])
  paymentMethod: 'cash' | 'bank';

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  receiptReference?: string;
}
