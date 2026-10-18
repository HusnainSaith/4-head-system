import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
export class UpdateShopPurchaseDto {
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsString() @MaxLength(255) notes?: string;
}
