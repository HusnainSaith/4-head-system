import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';
import {
  InvestmentAssignmentStatus,
  InvestmentAssignmentType,
  InvestmentOutcome,
} from '../entities/investment-assignment.entity';

export class CreateInvestmentAssignmentDto {
  @IsUUID() purchaseId: string;
  @IsUUID() investorPartyId: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  principalAmount: number;
  @IsEnum(InvestmentAssignmentType) assignmentType: InvestmentAssignmentType;
  @IsOptional() @IsEnum(InvestmentOutcome) outcome?: InvestmentOutcome;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  returnRate?: number;
  @IsDateString() assignmentDate: string;
  @IsOptional() @IsString() @MaxLength(100) externalReference?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class ListInvestmentAssignmentsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional()
  @IsEnum(InvestmentAssignmentStatus)
  status?: InvestmentAssignmentStatus;
  @IsOptional() @IsUUID() investorPartyId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class RecordInvestmentPaymentDto extends PaymentAccountSelectionDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;
  @IsIn(['cash', 'bank']) paymentMethod: 'cash' | 'bank';
  @IsDateString() paymentDate: string;
  @IsOptional() @IsString() @MaxLength(255) notes?: string;
}

export class UpdateInvestmentAssignmentDto {
  @IsOptional() @IsString() @MaxLength(100) externalReference?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CancelInvestmentAssignmentDto {
  @IsString() @MaxLength(500) reason: string;
}
