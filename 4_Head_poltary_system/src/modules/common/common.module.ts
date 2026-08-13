import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { ApprovalWorkflow } from './entities/approval-workflow.entity';
import { Attachment } from './entities/attachment.entity';
import { User } from '../users/entities/user.entity';
import { GuardsModule } from '../../common/modules/guards.module';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';
import { AUDIT_LOG_REPOSITORY } from './interfaces/audit-log-repository.interface';
import { AuditLogController } from './audit-log.controller';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { ApprovalWorkflowRepository } from './approval-workflow.repository';
import { ApprovalWorkflowController } from './approval-workflow.controller';
import { AttachmentService } from './attachment.service';
import { AttachmentRepository } from './attachment.repository';
import { AttachmentController } from './attachment.controller';
import { ATTACHMENT_REPOSITORY } from './interfaces/attachment-repository.interface';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, ApprovalWorkflow, Attachment, User]),
    GuardsModule,
  ],
  controllers: [
    AuditLogController,
    ApprovalWorkflowController,
    AttachmentController,
  ],
  providers: [
    AuditLogService,
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogRepository },
    ApprovalWorkflowService,
    ApprovalWorkflowRepository,
    AttachmentService,
    { provide: ATTACHMENT_REPOSITORY, useClass: AttachmentRepository },
  ],
  exports: [
    AuditLogService,
    ApprovalWorkflowService,
    AttachmentService,
    ATTACHMENT_REPOSITORY,
    AUDIT_LOG_REPOSITORY,
  ],
})
export class CommonModule {}
