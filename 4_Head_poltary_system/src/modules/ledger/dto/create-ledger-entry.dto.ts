import {
  IsUUID,
  IsEnum,
  IsDecimal,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateLedgerEntryDto {
  @IsUUID() departmentId: string;
  @IsUUID() accountId: string;
  @IsOptional() @IsUUID() partyId?: string;
  @IsEnum(['debit', 'credit']) entryType: 'debit' | 'credit';
  @IsDecimal() amount: string;
  @IsDateString() entryDate: string;
  @IsString() sourceType: string;
  @IsUUID() sourceId: string;
  @IsOptional() @IsString() description?: string;
}
