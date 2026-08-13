import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalWorkflow } from './entities/approval-workflow.entity';

@Injectable()
export class ApprovalWorkflowRepository {
  constructor(
    @InjectRepository(ApprovalWorkflow)
    private readonly repo: Repository<ApprovalWorkflow>,
  ) {}

  create(data: Partial<ApprovalWorkflow>) {
    return this.repo.create(data);
  }

  save(approval: Partial<ApprovalWorkflow>) {
    return this.repo.save(approval);
  }

  findOne(options: Parameters<Repository<ApprovalWorkflow>['findOne']>[0]) {
    return this.repo.findOne(options);
  }

  find(options: Parameters<Repository<ApprovalWorkflow>['find']>[0]) {
    return this.repo.find(options);
  }
}
