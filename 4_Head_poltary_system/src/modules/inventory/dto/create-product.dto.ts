import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum ProductCategoryDto {
  LIVE_BIRD = 'LIVE_BIRD',
  LIVESTOCK = 'LIVESTOCK',
  FEED = 'FEED',
  FRESH_CHICKEN = 'FRESH_CHICKEN',
  PROCESSED = 'PROCESSED',
  WASTE = 'WASTE',
  OTHER = 'OTHER',
}

export enum ProductUomDto {
  KG = 'KG',
  PIECE = 'PIECE',
  UNIT = 'UNIT',
  LITER = 'LITER',
  DOZEN = 'DOZEN',
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(ProductCategoryDto)
  category: ProductCategoryDto;

  @IsEnum(ProductUomDto)
  unit: ProductUomDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  standardWeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumStockLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumStockLevel?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  hsn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sac?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
