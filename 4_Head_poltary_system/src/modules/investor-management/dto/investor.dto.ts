import { Type } from 'class-transformer';
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
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';
import { InvestorCapitalTransactionType } from '../entities/investor-capital-transaction.entity';
import {
  InvestorProfitPeriodStatus,
  InvestorProfitPeriodType,
} from '../entities/investor-profit-period.entity';
import { InvestorStatus, InvestorType } from '../entities/investor.entity';

const POSITIVE_MONEY = /^(?!0+(?:\.0{1,2})?$)\d+(?:\.\d{1,2})?$/;
const PERCENTAGE = /^(?:100(?:\.0{1,4})?|\d{1,2}(?:\.\d{1,4})?)$/;

export class CreateInvestorDto {
  @IsUUID() partyId: string;
  @IsEnum(InvestorType) investorType: InvestorType;
  @IsOptional() @IsString() @Matches(PERCENTAGE) profitSharePercentage?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
export class UpdateInvestorDto {
  @IsOptional() @IsString() @Matches(PERCENTAGE) profitSharePercentage?: string;
  @IsOptional() @IsEnum(InvestorStatus) status?: InvestorStatus;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
export class ListInvestorsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(InvestorStatus) status?: InvestorStatus;
  @IsOptional() @IsEnum(InvestorType) investorType?: InvestorType;
  @IsOptional() @IsString() @MaxLength(150) search?: string;
}
export class RecordCapitalTransactionDto extends PaymentAccountSelectionDto {
  @IsUUID() departmentId: string;
  @IsString() @Matches(POSITIVE_MONEY) amount: string;
  @IsEnum(['cash', 'bank']) paymentMethod: 'cash' | 'bank';
  @IsDateString({ strict: true }) transactionDate: string;
  @IsOptional()
  @IsEnum(InvestorCapitalTransactionType)
  transactionType?: InvestorCapitalTransactionType;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
export enum InvestorAccountAction {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  PROFIT = 'profit',
  LOSS = 'loss',
  FARM_TRANSFER = 'farm_transfer',
}
export class RecordInvestorAccountTransactionDto extends PaymentAccountSelectionDto {
  @IsEnum(InvestorAccountAction) action: InvestorAccountAction;
  @IsUUID() departmentId: string;
  @IsString() @Matches(POSITIVE_MONEY) amount: string;
  @IsDateString({ strict: true }) transactionDate: string;
  @IsOptional() @IsEnum(['cash', 'bank']) paymentMethod?: 'cash' | 'bank';
  @IsOptional() @IsUUID() farmPartyId?: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
export class CalculateProfitPeriodDto {
  @IsUUID() departmentId: string;
  @IsEnum(InvestorProfitPeriodType) periodType: InvestorProfitPeriodType;
  @IsDateString({ strict: true }) startDate: string;
  @IsDateString({ strict: true }) endDate: string;
}
export class ListProfitPeriodsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional()
  @IsEnum(InvestorProfitPeriodStatus)
  status?: InvestorProfitPeriodStatus;
  @IsOptional() @IsDateString({ strict: true }) from?: string;
  @IsOptional() @IsDateString({ strict: true }) to?: string;
}
export class DistributeInvestorProfitDto extends PaymentAccountSelectionDto {
  @IsUUID() profitAllocationId: string;
  @IsUUID() departmentId: string;
  @IsString() @Matches(POSITIVE_MONEY) amount: string;
  @IsEnum(['cash', 'bank']) paymentMethod: 'cash' | 'bank';
  @IsDateString({ strict: true }) transactionDate: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
