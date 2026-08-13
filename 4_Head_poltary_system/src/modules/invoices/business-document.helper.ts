import { Logger } from '@nestjs/common';
import { CreateNotificationDto } from '../notifications/notification.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInvoiceDto } from './invoice.dto';
import { InvoicesService } from './invoices.service';

export async function publishBusinessDocument(
  invoices: InvoicesService,
  notifications: NotificationsService,
  invoice: CreateInvoiceDto,
  actorId: string,
  notification: Omit<
    CreateNotificationDto,
    'recipientUserId' | 'sourceType' | 'sourceId'
  >,
  logger: Logger,
) {
  const [invoiceResult] = await Promise.allSettled([
    invoices.create(invoice, actorId),
  ]);
  if (invoiceResult.status === 'rejected')
    logger.error(
      `Invoice generation failed for ${invoice.sourceType}/${invoice.sourceId}`,
      invoiceResult.reason instanceof Error
        ? invoiceResult.reason.stack
        : String(invoiceResult.reason),
    );
  const invoiceNumber =
    invoiceResult.status === 'fulfilled'
      ? invoiceResult.value.invoiceNumber
      : 'Unavailable';
  const [notificationResult] = await Promise.allSettled([
    notifications.send({
      ...notification,
      recipientUserId: actorId,
      sourceType: invoice.sourceType,
      sourceId: invoice.sourceId,
      context: {
        ...notification.context,
        invoiceNumber,
      },
    }),
  ]);
  if (notificationResult.status === 'rejected')
    logger.error(
      `Notification persistence failed for ${invoice.sourceType}/${invoice.sourceId}`,
      notificationResult.reason instanceof Error
        ? notificationResult.reason.stack
        : String(notificationResult.reason),
    );
}

export async function publishBusinessNotification(
  notifications: NotificationsService,
  dto: CreateNotificationDto,
  logger: Logger,
) {
  const [result] = await Promise.allSettled([notifications.send(dto)]);
  if (result.status === 'rejected')
    logger.error(
      `Notification persistence failed for ${dto.sourceType}/${dto.sourceId}`,
      result.reason instanceof Error
        ? result.reason.stack
        : String(result.reason),
    );
}
