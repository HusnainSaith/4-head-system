import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationQueryDto } from './notification.dto';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}

  create(data: Partial<Notification>) {
    return this.repository.create(data);
  }

  save(notification: Notification) {
    return this.repository.save(notification);
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.repository.update(id, { updatedBy: deletedBy });
    await this.repository.softDelete(id);
  }

  findOne(id: string) {
    return this.repository.findOne({
      where: { id, deletedAt: null } as any,
      relations: ['recipientUser'],
    });
  }

  async findAll(query: NotificationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.repository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipientUser', 'recipientUser')
      .where('notification.deleted_at IS NULL')
      .orderBy('notification.createdAt', 'DESC');
    if (query.status)
      qb.andWhere('notification.status = :status', { status: query.status });
    if (query.sourceType)
      qb.andWhere('notification.source_type = :sourceType', {
        sourceType: query.sourceType,
      });
    if (query.recipientUserId)
      qb.andWhere('notification.recipient_user_id = :recipientUserId', {
        recipientUserId: query.recipientUserId,
      });
    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
      },
    };
  }
}
