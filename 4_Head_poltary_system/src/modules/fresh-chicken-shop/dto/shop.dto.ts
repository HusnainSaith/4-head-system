import {
  IsUUID,
  IsNumber,
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
  IsPositive,
  Min,
} from 'class-validator';
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';

export class CreateShopSaleDto extends PaymentAccountSelectionDto {
  @IsOptional()
  @IsUUID()
  customerPartyId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsNumber()
  @IsPositive()
  quantityKg: number;

  @IsNumber()
  @IsPositive()
  ratePerKg: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountReceived?: number;

  @IsEnum(['cash', 'bank', 'credit'])
  paymentMethod: 'cash' | 'bank' | 'credit';

  @IsDateString()
  saleDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
