import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { existsSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  CreateNotificationDto,
  NotificationQueryDto,
} from './notification.dto';
import { Notification } from './notification.entity';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repository: NotificationsRepository,
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  private async resolveEmail(dto: CreateNotificationDto) {
    if (dto.recipientEmail) return dto.recipientEmail;
    if (!dto.recipientUserId) return undefined;
    return (
      await this.users.findOne({
        where: {
          id: dto.recipientUserId,
          isActive: true,
          deletedAt: null,
        } as any,
      })
    )?.email;
  }

  private context(dto: CreateNotificationDto) {
    return {
      companyName: this.config.get('COMPANY_NAME', '4Head Poultry'),
      companyAddress: this.config.get('COMPANY_ADDRESS', ''),
      companyPhone: this.config.get('COMPANY_PHONE', ''),
      title: dto.title,
      message: dto.message,
      status: 'Recorded',
      date: new Date().toLocaleDateString('en-PK'),
      amount: '',
      ...dto.context,
    };
  }

  private async deliver(
    notification: Notification,
    dto: CreateNotificationDto,
  ): Promise<Notification> {
    try {
      const recipientEmail = await this.resolveEmail(dto);
      if (!recipientEmail) throw new Error('Recipient email is unavailable');
      if (this.config.get('DISABLE_EMAIL_DELIVERY') === 'true') {
        notification.recipientEmail = recipientEmail;
        notification.status = 'sent';
        notification.sentAt = new Date();
        notification.errorMessage = null;
        return this.repository.save(notification);
      }
      const templatePath = join(__dirname, 'templates', `${dto.type}.hbs`);
      if (!existsSync(templatePath)) {
        throw new Error(`Email template is unavailable: ${dto.type}`);
      }
      const timeoutMs = Number(
        this.config.get('NOTIFICATION_EMAIL_TIMEOUT_MS', '5000'),
      );
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          this.mailerService.sendMail({
            to: recipientEmail,
            subject: dto.title,
            template: dto.type,
            context: this.context(dto),
          }),
          new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(
              () => reject(new Error('Email delivery timed out')),
              Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000,
            );
          }),
        ]);
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
      notification.recipientEmail = recipientEmail;
      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.errorMessage = null;
    } catch (error) {
      notification.status = 'failed';
      notification.errorMessage = (error as Error).message;
      this.logger.warn(
        `Notification ${notification.id} failed: ${notification.errorMessage}`,
      );
    }
    return this.repository.save(notification);
  }

  async send(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.repository.save(
      this.repository.create({
        ...dto,
        status: 'pending',
        createdBy: dto.recipientUserId,
      }),
    );
    return this.deliver(notification, dto);
  }

  /** Persist an ERP activity notification without sending an email. */
  async sendInApp(dto: CreateNotificationDto): Promise<Notification> {
    return this.repository.save(
      this.repository.create({
        ...dto,
        status: 'sent',
        sentAt: new Date(),
        createdBy: dto.recipientUserId,
      }),
    );
  }

  async sendBulk(dtos: CreateNotificationDto[]): Promise<void> {
    await Promise.allSettled(dtos.map((dto) => this.send(dto)));
  }

  async findAll(query: NotificationQueryDto) {
    return {
      success: true,
      message: 'Notifications retrieved',
      data: await this.repository.findAll(query),
    };
  }

  async findOne(id: string) {
    const notification = await this.repository.findOne(id);
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async retry(id: string) {
    const notification = await this.findOne(id);
    if (notification.status !== 'failed') return notification;
    return this.resendNotification(notification);
  }

  async resend(id: string) {
    return this.resendNotification(await this.findOne(id));
  }

  async remove(id: string, deletedBy: string) {
    await this.findOne(id);
    await this.repository.softDelete(id, deletedBy);
    return {
      success: true,
      message: 'Notification deleted successfully',
      data: null,
    };
  }

  private async resendNotification(notification: Notification) {
    notification.status = 'pending';
    notification.errorMessage = null;
    notification.sentAt = null;
    await this.repository.save(notification);
    return this.deliver(notification, {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      recipientEmail: notification.recipientEmail,
      recipientUserId: notification.recipientUserId,
      sourceType: notification.sourceType,
      sourceId: notification.sourceId,
      context: notification.context,
    });
  }
}
