import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { invoiceTypes, InvoiceStatus, InvoiceType } from './invoice.entity';

export class InvoiceLineItemDto {
  @IsString()
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  qty: number;

  @IsString()
  unit: string;

  @Type(() => Number)
  @IsNumber()
  rate: number;

  @Type(() => Number)
  @IsNumber()
  amount: number;
}

export class CreateInvoiceDto {
  @IsIn(invoiceTypes)
  invoiceType: InvoiceType;

  @IsUUID()
  departmentId: string;

  @IsString()
  sourceType: string;

  @IsUUID()
  sourceId: string;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsOptional()
  @IsString()
  partyName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems: InvoiceLineItemDto[];

  @Type(() => Number)
  @IsNumber()
  subtotal: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @Type(() => Number)
  @IsNumber()
  totalAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['draft', 'posted'])
  status?: Extract<InvoiceStatus, 'draft' | 'posted'>;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;
}

export class InvoiceQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(invoiceTypes)
  invoiceType?: InvoiceType;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
