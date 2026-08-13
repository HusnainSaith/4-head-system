import {
  IsUUID,
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  departmentId: string;

  @IsString()
  @IsNotEmpty()
  payeeType: string;

  @IsUUID()
  payeeId: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  paymentMode: string;

  @IsString()
  @IsNotEmpty()
  paymentDate: string;

  @IsString()
  @IsNotEmpty()
  paymentType: string;

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
