import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum AuditActionTypeDto {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  POST = 'POST',
  REVERSE = 'REVERSE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  VIEW = 'VIEW',
}

export enum AuditStatusDto {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export class CreateAuditLogDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsEnum(AuditActionTypeDto)
  actionType: AuditActionTypeDto;

  @IsOptional()
  @IsString()
  oldValues?: string;

  @IsOptional()
  @IsString()
  newValues?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;

  @IsEnum(AuditStatusDto)
  status: AuditStatusDto;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  errorMessage?: string;
}
