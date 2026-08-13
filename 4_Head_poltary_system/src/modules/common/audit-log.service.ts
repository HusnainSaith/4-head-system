import { Injectable, Logger, Inject } from '@nestjs/common';
import { Between } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import {
  AuditLogRepositoryInterface,
  AUDIT_LOG_REPOSITORY,
} from './interfaces/audit-log-repository.interface';

export interface AuditLogData {
  userId: string;
  entityType: string;
  entityId: string;
  actionType:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'POST'
    | 'REVERSE'
    | 'APPROVE'
    | 'REJECT'
    | 'VIEW';
  oldValues?: any;
  newValues?: any;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepo: AuditLogRepositoryInterface,
  ) {}

  async log(data: AuditLogData): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepo.create({
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        actionType: data.actionType,
        oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
        newValues: data.newValues ? JSON.stringify(data.newValues) : null,
        description: data.description,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
        status: 'SUCCESS',
      });

      return await this.auditLogRepo.save(auditLog);
    } catch (error) {
      this.logger.error('Audit log error:', error);
      return null;
    }
  }

  async logFailure(
    data: AuditLogData,
    errorMessage: string,
  ): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepo.create({
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        actionType: data.actionType,
        oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
        newValues: data.newValues ? JSON.stringify(data.newValues) : null,
        description: data.description,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
        status: 'FAILURE',
        errorMessage,
      });

      return await this.auditLogRepo.save(auditLog);
    } catch (error) {
      this.logger.error('Audit log failure recording error:', error);
      return null;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const [data, total] = await this.auditLogRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const [data, total] = await this.auditLogRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { entityType, entityId },
      order: { createdAt: 'ASC' },
    });
  }

  async findByActionType(
    actionType: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const [data, total] = await this.auditLogRepo.findAndCount({
      where: { actionType: actionType as any },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const [data, total] = await this.auditLogRepo.findAndCount({
      where: {
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async exportLogs(startDate?: Date, endDate?: Date): Promise<AuditLog[]> {
    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    }

    return this.auditLogRepo.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }

  async getStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    }

    const logs = await this.auditLogRepo.find({ where });

    const stats = {
      total: logs.length,
      byAction: {} as Record<string, number>,
      byEntity: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      successCount: 0,
      failureCount: 0,
    };

    logs.forEach((log) => {
      stats.byAction[log.actionType] =
        (stats.byAction[log.actionType] || 0) + 1;
      stats.byEntity[log.entityType] =
        (stats.byEntity[log.entityType] || 0) + 1;
      stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;

      if (log.status === 'SUCCESS') stats.successCount++;
      if (log.status === 'FAILURE') stats.failureCount++;
    });

    return stats;
  }
}
