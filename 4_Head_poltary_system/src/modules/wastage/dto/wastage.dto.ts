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

export class CreateWastagePurchaseDto extends PaymentAccountSelectionDto {
  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsNumber()
  @IsPositive()
  quantityKg: number;

  @IsNumber()
  @IsPositive()
  ratePerKg: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @IsEnum(['cash', 'bank', 'credit'])
  paymentMethod: 'cash' | 'bank' | 'credit';

  @IsDateString()
  purchaseDate: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateWastageSaleDto extends PaymentAccountSelectionDto {
  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsNumber()
  @IsPositive()
  quantityKg: number;

  @IsNumber()
  @IsPositive()
  ratePerKg: number;

  @IsEnum(['cash', 'bank', 'credit'])
  paymentMethod: 'cash' | 'bank' | 'credit';

  @IsDateString()
  saleDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountReceived?: number;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
