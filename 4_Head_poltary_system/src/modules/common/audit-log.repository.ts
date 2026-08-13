import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogRepositoryInterface } from './interfaces/audit-log-repository.interface';

@Injectable()
export class AuditLogRepository implements AuditLogRepositoryInterface {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  create(data: Partial<AuditLog>) {
    return this.repo.create(data);
  }

  save(auditLog: Partial<AuditLog>) {
    return this.repo.save(auditLog);
  }

  findAndCount(options: Parameters<Repository<AuditLog>['findAndCount']>[0]) {
    return this.repo.findAndCount(options);
  }

  find(options: Parameters<Repository<AuditLog>['find']>[0]) {
    return this.repo.find(options);
  }
}
