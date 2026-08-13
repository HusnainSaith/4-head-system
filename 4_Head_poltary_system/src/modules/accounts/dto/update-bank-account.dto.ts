import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateBankAccountDto {
  @IsOptional() @IsString() @MinLength(2) bankName?: string;
  @IsOptional() @IsString() @MinLength(2) accountTitle?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() branchName?: string;
}
