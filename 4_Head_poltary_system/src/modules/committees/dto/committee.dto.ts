import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCommitteeDto {
  @IsUUID() departmentId: string;
  @IsString() @MaxLength(150) name: string;
  @Type(() => Number) @IsNumber() @IsPositive() installmentAmount: number;
  @Type(() => Number) @IsInt() @Min(1) totalMembers: number;
  @Type(() => Number) @IsInt() @Min(1) payoutPosition: number;
  @IsDateString() startDate: string;
}

export class UpdateCommitteeDto {
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  installmentAmount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) totalMembers?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) payoutPosition?: number;
  @IsOptional() @IsDateString() startDate?: string;
}

export class CreateInstallmentDto {
  @Type(() => Number) @IsNumber() @IsPositive() amount: number;
  @IsDateString() installmentDate: string;
  @IsOptional() @IsEnum(['cash', 'bank']) paymentMethod: 'cash' | 'bank' =
    'cash';
}

export class CreatePayoutDto {
  @Type(() => Number) @IsNumber() @IsPositive() payoutAmount: number;
  @IsDateString() payoutDate: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalContributed?: number;
  @IsOptional() @IsEnum(['cash', 'bank']) paymentMethod: 'cash' | 'bank' =
    'cash';
}
