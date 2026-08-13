import { AuditLog } from '../entities/audit-log.entity';

export const AUDIT_LOG_REPOSITORY = 'AUDIT_LOG_REPOSITORY';

export interface AuditLogRepositoryInterface {
  create(data: Partial<AuditLog>): AuditLog;
  save(auditLog: Partial<AuditLog>): Promise<AuditLog> | Promise<any>;
  findAndCount(options?: any): Promise<[AuditLog[], number]>;
  find(options?: any): Promise<AuditLog[]>;
}
