import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BrotherAdjustmentStatus } from '../entities/brother-farm-adjustment.entity';
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';

const POSITIVE_MONEY = /^(?!0+(?:\.0{1,2})?$)\d+(?:\.\d{1,2})?$/;

export class ConfigureBrotherAccountDto {
  @IsUUID() partyId: string;
}
export class CreateBrotherAdjustmentDto {
  @IsUUID() farmPartyId: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsString() @Matches(POSITIVE_MONEY) amount: string;
  @IsDateString({ strict: true }) transactionDate: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
export class ReverseBrotherAdjustmentDto {
  @IsString() @MaxLength(500) reason: string;
  @IsOptional() @IsDateString({ strict: true }) transactionDate?: string;
}
export class RecordBrotherPaymentDto extends PaymentAccountSelectionDto {
  @IsUUID() departmentId: string;
  @IsString() @Matches(POSITIVE_MONEY) amount: string;
  @IsEnum(['cash', 'bank']) paymentMethod: 'cash' | 'bank';
  @IsDateString({ strict: true }) paymentDate: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
export class ListBrotherAdjustmentsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsUUID() farmPartyId?: string;
  @IsOptional() @IsDateString({ strict: true }) from?: string;
  @IsOptional() @IsDateString({ strict: true }) to?: string;
  @IsOptional()
  @IsEnum(BrotherAdjustmentStatus)
  status?: BrotherAdjustmentStatus;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsString() @MaxLength(150) search?: string;
}
export class ListBrotherPaymentsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
