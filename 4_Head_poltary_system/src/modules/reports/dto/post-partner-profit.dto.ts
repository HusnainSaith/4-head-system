import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';
export class PostPartnerProfitDto {
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsString() @Matches(/^-?\d+(\.\d{1,2})?$/) expectedNetProfit: string;
}
