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
  IsNotEmpty,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BrokeragePurchaseStatus } from '../entities/brokerage-purchase.entity';
import {
  BrokerageSaleDestination,
  BrokerageSaleStatus,
} from '../entities/brokerage-sale.entity';
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';

// ── List query DTOs ──────────────────────────────────────────────────────────

export class ListBrokeragePurchasesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ['cash', 'credit'] })
  @IsOptional()
  @IsEnum(['cash', 'credit'])
  paymentMethod?: 'cash' | 'credit';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: BrokeragePurchaseStatus })
  @IsOptional()
  @IsEnum(BrokeragePurchaseStatus)
  status?: BrokeragePurchaseStatus;
}

export class ListBrokerageSalesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ['cash', 'credit'] })
  @IsOptional()
  @IsEnum(['cash', 'credit'])
  paymentMethod?: 'cash' | 'credit';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: BrokerageSaleStatus })
  @IsOptional()
  @IsEnum(BrokerageSaleStatus)
  status?: BrokerageSaleStatus;
}

// ── Stock movement list query ────────────────────────────────────────────────

export class ListStockMovementsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  movementType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceId?: string;
}

// ── Create / Update DTOs ─────────────────────────────────────────────────────

export class CreateBrokeragePurchaseDto extends PaymentAccountSelectionDto {
  @IsUUID()
  @IsOptional()
  partyId?: string;

  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @IsNumber()
  @IsPositive()
  quantityKg: number;

  @IsNumber()
  @IsPositive()
  ratePerKg: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amountPaid?: number;

  @IsEnum(['cash', 'bank', 'credit'])
  paymentMethod: 'cash' | 'bank' | 'credit';

  @IsDateString()
  purchaseDate: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBrokeragePurchaseDto {
  @IsUUID()
  @IsOptional()
  partyId?: string;

  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantityKg?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  ratePerKg?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amountPaid?: number;

  @IsEnum(['cash', 'credit'])
  @IsOptional()
  paymentMethod?: 'cash' | 'credit';

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateBrokerageSaleDto extends PaymentAccountSelectionDto {
  @IsEnum(BrokerageSaleDestination)
  @IsOptional()
  destinationType?: BrokerageSaleDestination;

  @IsUUID()
  @IsOptional()
  partyId?: string;

  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @IsNumber()
  @IsPositive()
  quantityKg: number;

  @IsNumber()
  @IsPositive()
  ratePerKg: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amountReceived?: number;

  @IsEnum(['cash', 'bank', 'credit'])
  paymentMethod: 'cash' | 'bank' | 'credit';

  @IsDateString()
  saleDate: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBrokerageSaleDto {
  @IsUUID()
  @IsOptional()
  partyId?: string;

  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantityKg?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  ratePerKg?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amountReceived?: number;

  @IsEnum(['cash', 'credit'])
  @IsOptional()
  paymentMethod?: 'cash' | 'credit';

  @IsDateString()
  @IsOptional()
  saleDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

// ── Cancellation DTOs ────────────────────────────────────────────────────────

export class CancelBrokeragePurchaseDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ValidateIf((o: CancelBrokeragePurchaseDto) => o.reason !== undefined)
  reason: string;
}

export class CancelBrokerageSaleDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @ValidateIf((o: CancelBrokerageSaleDto) => o.reason !== undefined)
  reason: string;
}
