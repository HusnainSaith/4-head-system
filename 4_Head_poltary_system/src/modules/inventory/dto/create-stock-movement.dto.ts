import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum StockMovementTypeDto {
  RECEIPT = 'RECEIPT',
  ISSUE = 'ISSUE',
  TRANSFER = 'TRANSFER',
  RETURN = 'RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
  WRITE_OFF = 'WRITE_OFF',
}

export class CreateStockMovementDto {
  @IsString()
  departmentId: string;

  @IsString()
  productId: string;

  @IsEnum(StockMovementTypeDto)
  movementType: StockMovementTypeDto;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  costPerUnit?: number;

  @IsOptional()
  @IsNumber()
  totalValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lotNumber?: string;

  @IsOptional()
  @IsString()
  batchMetadata?: string;

  @IsOptional()
  @IsDateString()
  manufacturingDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsString()
  purchaseId?: string;

  @IsOptional()
  @IsString()
  saleId?: string;

  @IsDateString()
  movementDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
