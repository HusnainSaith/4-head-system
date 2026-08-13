import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum StockValuationMethodDto {
  FIFO = 'FIFO',
  LIFO = 'LIFO',
  WEIGHTED_AVERAGE = 'WEIGHTED_AVERAGE',
}

export class CreateStockBalanceDto {
  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valuationAmount?: number;

  @IsEnum(StockValuationMethodDto)
  valuationMethod: StockValuationMethodDto;

  @IsOptional()
  @IsDateString()
  lastReceiptDate?: string;

  @IsOptional()
  @IsDateString()
  lastIssueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumLevel?: number;
}
