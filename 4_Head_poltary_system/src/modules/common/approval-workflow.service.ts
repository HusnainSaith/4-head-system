import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApprovalWorkflow } from './entities/approval-workflow.entity';
import { CreateApprovalWorkflowDto } from './dto/create-approval-workflow.dto';
import { ApprovalWorkflowRepository } from './approval-workflow.repository';

@Injectable()
export class ApprovalWorkflowService {
  constructor(private readonly approvalRepo: ApprovalWorkflowRepository) {}

  async createApproval(
    data: CreateApprovalWorkflowDto,
  ): Promise<ApprovalWorkflow> {
    const approval = this.approvalRepo.create({
      ...data,
      status: 'PENDING',
      approvalLevel: 'PENDING_APPROVAL',
      approvalDate: undefined,
    });
    return this.approvalRepo.save(approval);
  }

  async approve(
    id: string,
    approverUserId: string,
    notes?: string,
  ): Promise<ApprovalWorkflow> {
    const approval = await this.approvalRepo.findOne({ where: { id } });
    if (!approval) throw new NotFoundException('Approval workflow not found');
    if (approval.status !== 'PENDING') {
      throw new BadRequestException('Can only approve pending workflows');
    }

    approval.status = 'APPROVED';
    approval.approverUserId = approverUserId;
    approval.approvalDate = new Date();
    approval.approvalNotes = notes;
    return this.approvalRepo.save(approval);
  }

  async reject(
    id: string,
    approverUserId: string,
    reason: string,
  ): Promise<ApprovalWorkflow> {
    const approval = await this.approvalRepo.findOne({ where: { id } });
    if (!approval) throw new NotFoundException('Approval workflow not found');
    if (approval.status !== 'PENDING') {
      throw new BadRequestException('Can only reject pending workflows');
    }

    approval.status = 'REJECTED';
    approval.approverUserId = approverUserId;
    approval.approvalDate = new Date();
    approval.rejectionReason = reason;
    return this.approvalRepo.save(approval);
  }

  async delegate(
    id: string,
    newApproverUserId: string,
  ): Promise<ApprovalWorkflow> {
    const approval = await this.approvalRepo.findOne({ where: { id } });
    if (!approval) throw new NotFoundException('Approval workflow not found');
    approval.approverUserId = newApproverUserId;
    return this.approvalRepo.save(approval);
  }

  async getPendingApprovals(
    approverUserId?: string,
  ): Promise<ApprovalWorkflow[]> {
    const where: any = { status: 'PENDING' };
    if (approverUserId) where.approverUserId = approverUserId;
    return this.approvalRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async getApprovalHistory(
    entityType: string,
    entityId: string,
  ): Promise<ApprovalWorkflow[]> {
    return this.approvalRepo.find({
      where: { entityType, entityId },
      order: { createdAt: 'ASC' },
    });
  }

  async requiresApproval(
    entityType: string,
    amount?: number,
  ): Promise<boolean> {
    const thresholds = {
      PURCHASE: 50000,
      SALE: 50000,
      EXPENSE: 10000,
      ADJUSTMENT: 0,
      TRANSFER: 0,
      JOURNAL_ENTRY: 0,
      SALARY_PAYMENT: 0,
    };

    const threshold = thresholds[entityType] || 0;
    if (threshold === 0) return true;
    return amount >= threshold;
  }
}
