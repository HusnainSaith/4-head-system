import {
  IsUUID,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsPositive,
} from 'class-validator';
import { StockType } from '../enums/stock-type.enum';

export class StockWriteoffDto {
  @IsOptional() @IsUUID() departmentId?: string;
  @IsNumber() @IsPositive() quantityKg: number;
  @IsNumber() @IsPositive() ratePerKg: number;
  @IsEnum(['spoilage', 'mortality', 'transit_loss', 'other']) reason: string;
  @IsOptional() @IsString() note?: string;
  @IsDateString() writeoffDate: string;
  @IsOptional() @IsEnum(StockType) stockType?: StockType;
}
