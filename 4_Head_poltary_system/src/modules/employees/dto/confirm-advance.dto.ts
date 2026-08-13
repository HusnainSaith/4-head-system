import { IsEnum } from 'class-validator';
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';

export class ConfirmAdvanceDto extends PaymentAccountSelectionDto {
  @IsEnum(['cash', 'bank'])
  paymentMethod: 'cash' | 'bank';
}
