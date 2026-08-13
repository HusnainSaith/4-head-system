import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentAccountSelectionDto } from '../../accounts/dto/payment-account-selection.dto';

export enum PartyPaymentDirection {
  RECEIVED = 'received',
  PAID = 'paid',
}

export enum PartyPaymentMethod {
  CASH = 'cash',
  BANK = 'bank',
}

export class RecordPartyPaymentDto extends PaymentAccountSelectionDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ minimum: 0.01, example: 250 })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PartyPaymentDirection })
  @IsEnum(PartyPaymentDirection)
  direction: PartyPaymentDirection;

  @ApiProperty({ format: 'date', example: '2026-07-12' })
  @IsDateString({ strict: true })
  paymentDate: string;

  @ApiProperty({ enum: PartyPaymentMethod })
  @IsEnum(PartyPaymentMethod)
  paymentMethod: PartyPaymentMethod;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
