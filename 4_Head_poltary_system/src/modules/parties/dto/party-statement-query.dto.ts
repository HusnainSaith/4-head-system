import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class PartyStatementQueryDto {
  @IsUUID()
  @IsOptional()
  partyId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
