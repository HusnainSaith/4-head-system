import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class AccountStatementQueryDto {
  @IsDateString() from: string;
  @IsDateString() to: string;
  @IsOptional() @IsIn(['cheque', 'app']) method?: 'cheque' | 'app';
}
