import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * DTO for settling a payable party and a receivable party against each other
 * in a single double-entry transaction without involving Cash or Bank.
 *
 * Example:
 * - Party A (Payable): Rs. 10,000
 * - Party B (Receivable): Rs. 10,000
 * - Settlement Amount: Rs. 10,000
 *
 * Result:
 * - Party A: 0
 * - Party B: 0
 * - Cash/Bank: unchanged
 */
export class CreatePartySettlementDto {
  @ApiProperty({
    format: 'uuid',
    description: 'The party that we have to PAY (positive balance)',
  })
  @IsUUID()
  payablePartyId: string;

  @ApiProperty({
    format: 'uuid',
    description: 'The party that we have to RECEIVE from (negative balance)',
  })
  @IsUUID()
  receivablePartyId: string;

  @ApiProperty({
    minimum: 0.01,
    example: 10000,
    description: 'Settlement amount. Must not exceed available balance on either side.',
  })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  settlementAmount: number;

  @ApiProperty({
    format: 'uuid',
    description: 'Department ID for the settlement transaction',
  })
  @IsUUID()
  departmentId: string;

  @ApiPropertyOptional({
    format: 'date',
    example: '2026-07-12',
    description: 'Settlement date (defaults to today)',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  settlementDate?: string;

  @ApiPropertyOptional({
    maxLength: 255,
    description: 'Reference number or voucher number for the settlement',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Notes or description for the settlement',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/**
 * DTO for updating an existing party settlement
 */
export class UpdatePartySettlementDto {
  @ApiPropertyOptional({
    minimum: 0.01,
    description: 'New settlement amount',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  settlementAmount?: number;

  @ApiPropertyOptional({
    format: 'date',
    description: 'New settlement date',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  settlementDate?: string;

  @ApiPropertyOptional({
    maxLength: 255,
    description: 'New reference number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'New notes or description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
