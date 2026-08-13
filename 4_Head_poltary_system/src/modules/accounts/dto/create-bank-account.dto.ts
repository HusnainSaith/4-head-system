import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBankAccountDto {
  @IsString() @MinLength(2) bankName: string;
  @IsString() @MinLength(2) accountTitle: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() branchName?: string;
  @IsOptional() @IsNumber() @Min(0) openingBalance?: number;
  @IsOptional() @IsDateString() openingBalanceDate?: string;
}
