import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum ApprovalWorkflowStatusDto {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum ApprovalLevelDto {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  AUTO_APPROVED = 'AUTO_APPROVED',
  FORCE_POSTED = 'FORCE_POSTED',
}

export class CreateApprovalWorkflowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  creatorUserId: string;

  @IsOptional()
  @IsString()
  approverUserId?: string;

  @IsEnum(ApprovalWorkflowStatusDto)
  status: ApprovalWorkflowStatusDto;

  @IsOptional()
  @IsDateString()
  approvalDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  approvalNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;

  @IsEnum(ApprovalLevelDto)
  approvalLevel: ApprovalLevelDto;
}
