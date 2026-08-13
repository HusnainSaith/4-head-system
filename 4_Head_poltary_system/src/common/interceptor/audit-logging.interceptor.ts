import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, mergeMap, catchError, throwError } from 'rxjs';
import { AuditLogService } from '../../modules/common/audit-log.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, params, ip, headers } = request;

    const actionMap = {
      POST: 'CREATE',
      GET: 'VIEW',
      PATCH: 'UPDATE',
      PUT: 'UPDATE',
      DELETE: 'DELETE',
    };

    const urlParts = url.split('/').filter(Boolean);
    const entityType = urlParts[0]?.toUpperCase() || 'UNKNOWN';
    const entityId = params?.id || body?.id || 'PENDING';

    let actionType = actionMap[method] || 'VIEW';
    if (url.includes('/post')) actionType = 'POST';
    if (url.includes('/approve')) actionType = 'APPROVE';
    if (url.includes('/reject')) actionType = 'REJECT';
    if (url.includes('/reverse')) actionType = 'REVERSE';
    if (url.includes('/cancel')) actionType = 'DELETE';

    return next.handle().pipe(
      mergeMap(async (response) => {
        if (user?.id && method !== 'GET') {
          await this.auditLogService.log({
            userId: user.id,
            entityType,
            entityId: response?.id || entityId,
            actionType: actionType as any,
            newValues:
              method === 'POST' || method === 'PATCH'
                ? this.redactSensitiveValues(body)
                : undefined,
            description: `${actionType} ${entityType} via ${method} ${url}`,
            ipAddress: ip,
            userAgent: headers['user-agent'],
            sessionId: headers['authorization']?.substring(0, 20),
          });
          if (this.isImportantMutation(method, url)) {
            const sourceId =
              this.responseId(response) ??
              (this.isUuid(entityId) ? entityId : randomUUID());
            const sourceType = this.sourceType(url);
            await this.notificationsService
              .sendInApp({
                type: 'system',
                title: this.notificationTitle(actionType, sourceType),
                message: this.notificationMessage(actionType, sourceType, body),
                recipientUserId: user.id,
                sourceType,
                sourceId,
                context: {
                  action: actionType,
                  method,
                  route: url.split('?')[0],
                },
              })
              .catch(() => undefined);
          }
        }
        return response;
      }),
      catchError((error) => {
        if (user?.id) {
          void this.auditLogService
            .logFailure(
              {
                userId: user.id,
                entityType,
                entityId,
                actionType: actionType as any,
                description: `Failed ${actionType} ${entityType}`,
                ipAddress: ip,
                userAgent: headers['user-agent'],
              },
              error.message,
            )
            .catch(() => undefined);
        }
        return throwError(() => error);
      }),
    );
  }

  private redactSensitiveValues(value: unknown): unknown {
    if (Array.isArray(value))
      return value.map((item) => this.redactSensitiveValues(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        /(password|token|secret|app.?password)/i.test(key)
          ? '[REDACTED]'
          : this.redactSensitiveValues(item),
      ]),
    );
  }

  private isImportantMutation(method: string, url: string): boolean {
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) return false;
    const source = this.sourceType(url);
    return new Set([
      'users',
      'roles',
      'departments',
      'parties',
      'brokerage',
      'supply',
      'wastage',
      'fresh_chicken_shop',
      'expenses',
      'expense_allocations',
      'employees',
      'payroll',
      'accounts',
      'investments',
      'investors',
      'investor_profit_periods',
      'brother',
      'committees',
      'zakat_funds',
      'vehicles',
      'inventory',
      'invoices',
    ]).has(source);
  }

  private sourceType(url: string): string {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    const start = parts[0] === 'api' && parts[1] === 'v1' ? 2 : 0;
    return (parts[start] ?? 'system').replaceAll('-', '_').slice(0, 50);
  }

  private responseId(response: unknown): string | undefined {
    if (!response || typeof response !== 'object') return undefined;
    const value = response as Record<string, unknown>;
    const nested =
      value.data && typeof value.data === 'object'
        ? (value.data as Record<string, unknown>).id
        : undefined;
    const candidate = value.id ?? nested;
    return typeof candidate === 'string' && this.isUuid(candidate)
      ? candidate
      : undefined;
  }

  private isUuid(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    );
  }

  private notificationTitle(action: string, sourceType: string): string {
    const source = sourceType.replaceAll('_', ' ');
    return `${source.charAt(0).toUpperCase()}${source.slice(1)} ${action.toLowerCase()} successful`;
  }

  private notificationMessage(
    action: string,
    sourceType: string,
    body: Record<string, unknown> | undefined,
  ): string {
    const source = sourceType.replaceAll('_', ' ');
    const amount = body?.amount;
    const amountText =
      typeof amount === 'string' || typeof amount === 'number'
        ? ` Amount: Rs ${amount}.`
        : '';
    return `${action.charAt(0)}${action.slice(1).toLowerCase()} ${source} operation completed.${amountText}`;
  }
}
