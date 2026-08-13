import {
  IsString,
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateMaintenanceLogDto {
  @IsDateString() maintenanceDate: string;
  @IsString() maintenanceType: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @IsPositive() cost: number;
  @IsOptional() @IsString() vendorName?: string;
  @IsEnum(['cash', 'bank']) paymentMethod: string;
}
