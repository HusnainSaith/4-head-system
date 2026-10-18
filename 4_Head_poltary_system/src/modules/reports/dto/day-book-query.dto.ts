import { IsDateString, IsOptional, IsUUID, Matches } from 'class-validator';
export class DayBookQueryDto {
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) from: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) to: string;
  @IsOptional() @IsUUID() departmentId?: string;
}
