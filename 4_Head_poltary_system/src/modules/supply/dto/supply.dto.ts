import {
  IsUUID,
  IsNumber,
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
  IsPositive,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';

export class CreateSupplyPurchaseDto extends PaymentAccountSelectionDto {
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

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @IsDateString()
  purchaseDate: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSupplySaleDto extends PaymentAccountSelectionDto {
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

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountReceived?: number;

  @IsDateString()
  saleDate: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateInternalTransferDto {
  @IsNumber()
  @IsPositive()
  quantityKg: number;

  @IsNumber()
  @IsPositive()
  internalRatePerKg: number;

  @IsDateString()
  transferDate: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SettleTransferDto extends PaymentAccountSelectionDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  settlementDate: string;

  @IsEnum(['cash', 'bank'])
  paymentMethod: 'cash' | 'bank';
}

export class SupplyListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsEnum(['cash', 'bank', 'credit']) paymentMethod?:
    'cash' | 'bank' | 'credit';
  @IsOptional() @IsUUID() partyId?: string;
  @IsOptional() @IsUUID() vehicleId?: string;
  @IsOptional() @IsEnum(['posted', 'cancelled']) status?:
    'posted' | 'cancelled';
}

export class TransferListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional()
  @IsEnum(['unsettled', 'partially_settled', 'settled'])
  settlementStatus?: 'unsettled' | 'partially_settled' | 'settled';
}
