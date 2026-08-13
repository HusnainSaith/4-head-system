import {
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateFuelLogDto {
  @IsDateString() fuelDate: string;
  @IsNumber() @IsPositive() liters: number;
  @IsNumber() @IsPositive() ratePerLiter: number;
  @IsOptional() @IsNumber() odometerReading?: number;
  @IsEnum(['cash', 'bank']) paymentMethod: string;
  @IsOptional() notes?: string;
}
