import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';
import { ZakatFundAllocationMethod } from '../entities/zakat-fund-settlement.entity';
import {
  ZakatFundStatus,
  ZakatFundType,
} from '../entities/zakat-fund-payment.entity';

const MONEY = /^(?:0*[1-9]\d{0,15}|0)\.\d{1,2}$|^[1-9]\d{0,15}$/;
const PERCENT = /^(?:100(?:\.0{1,4})?|(?:\d|[1-9]\d)(?:\.\d{1,4})?)$/;
const optionalText = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class RecordZakatFundPaymentDto extends PaymentAccountSelectionDto {
  @IsUUID() departmentId: string;
  @IsEnum(ZakatFundType) accountType: ZakatFundType;
  @Matches(MONEY) amount: string;
  @IsDateString() paymentDate: string;
  @IsIn(['cash', 'bank']) paymentMethod: 'cash' | 'bank';
  @IsString() @Length(1, 150) recipientName: string;
  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @Length(1, 100)
  reference?: string;
  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @Length(1, 500)
  notes?: string;
}

export class SettlementSplitDto {
  @IsUUID() partyId: string;
  @IsOptional() @Matches(PERCENT) percentage?: string;
  @IsOptional() @Matches(MONEY) amount?: string;
}

export class SettleZakatFundDto {
  @IsUUID() departmentId: string;
  @IsEnum(ZakatFundType) accountType: ZakatFundType;
  @Type(() => Number) @IsInt() @Min(2000) @Max(2100) calendarYear: number;
  @IsDateString() settlementDate: string;
  @IsEnum(ZakatFundAllocationMethod)
  allocationMethod: ZakatFundAllocationMethod;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SettlementSplitDto)
  splits: SettlementSplitDto[];
  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @Length(1, 100)
  reference?: string;
  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @Length(1, 500)
  notes?: string;
}

export class ListZakatFundsDto {
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsEnum(ZakatFundType) accountType?: ZakatFundType;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  calendarYear?: number;
  @IsOptional() @IsEnum(ZakatFundStatus) status?: ZakatFundStatus;
}

export class ReverseZakatFundDto {
  @IsString() @Length(3, 500) reason: string;
}
