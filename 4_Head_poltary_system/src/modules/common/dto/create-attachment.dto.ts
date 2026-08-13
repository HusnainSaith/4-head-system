import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum AttachmentDocumentTypeDto {
  INVOICE = 'INVOICE',
  RECEIPT = 'RECEIPT',
  VOUCHER = 'VOUCHER',
  PROOF = 'PROOF',
  NOTE = 'NOTE',
  OTHER = 'OTHER',
}

export class CreateAttachmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  parentType: string;

  @IsString()
  @IsNotEmpty()
  parentId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  fileUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  uploadedBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(AttachmentDocumentTypeDto)
  documentType: AttachmentDocumentTypeDto;
}
