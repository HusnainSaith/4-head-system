import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DepartmentScopeGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const roleName = (user.role?.name ?? '').toLowerCase();
    if (roleName === 'owner' || roleName === 'accountant') {
      return true;
    }

    if (roleName !== 'department_staff') {
      throw new ForbiddenException(
        'Role is not authorized for department operations',
      );
    }

    const departmentId = user.departmentId as string | undefined;
    if (!departmentId) {
      throw new ForbiddenException('Department assignment is required');
    }

    const requestedDepartment =
      request.body?.departmentId ??
      request.body?.primaryDepartmentId ??
      request.query?.departmentId ??
      request.params?.departmentId;
    if (requestedDepartment && requestedDepartment !== departmentId) {
      throw new ForbiddenException(
        'Department staff can only access their assigned department',
      );
    }
    if (
      Array.isArray(request.body?.departmentIds) &&
      request.body.departmentIds.some((id: string) => id !== departmentId)
    ) {
      throw new ForbiddenException(
        'Department staff cannot assign records to another department',
      );
    }

    if (request.body && request.body.departmentId === undefined) {
      request.body.departmentId = departmentId;
    }
    if (request.method === 'GET' && request.query) {
      request.query.departmentId = departmentId;
    }

    const path =
      request.originalUrl || request.baseUrl || request.route?.path || '';
    const map: { [key: string]: string } = {
      '/brokerage': 'BROKERAGE',
      '/supply': 'SUPPLY',
      '/wastage': 'WASTAGE',
      '/shop': 'FRESH_CHICKEN_SHOP',
    };
    const requiredType = Object.entries(map).find(([k]) =>
      path.startsWith(k),
    )?.[1];
    if (requiredType && user.departmentType !== requiredType) {
      throw new ForbiddenException(
        `This route requires ${requiredType} department access`,
      );
    }

    const recordId = request.params?.id as string | undefined;
    if (recordId) {
      const ownerDepartment = await this.resolveRecordDepartment(
        path,
        recordId,
        departmentId,
      );
      if (ownerDepartment && ownerDepartment !== departmentId) {
        throw new ForbiddenException(
          'The requested record belongs to another department',
        );
      }
    }
    return true;
  }

  private async resolveRecordDepartment(
    path: string,
    id: string,
    departmentId: string,
  ): Promise<string | null> {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      return null;
    }

    if (path.startsWith('/expenses/categories/')) return null;

    if (path.startsWith('/parties/')) {
      const rows = await this.dataSource.query(
        `SELECT CASE WHEN pd.department_id IS NOT NULL THEN pd.department_id
                     ELSE p.primary_department_id END AS department_id
         FROM parties p
         LEFT JOIN party_departments pd
           ON pd.party_id = p.id AND pd.department_id = $2
         WHERE p.id = $1 AND p.deleted_at IS NULL
         LIMIT 1`,
        [id, departmentId],
      );
      return rows[0]?.department_id ?? null;
    }

    let table: string | undefined;
    let join: string | undefined;
    if (path.startsWith('/expenses/')) table = 'expenses';
    else if (path.startsWith('/committees/')) table = 'committees';
    else if (path.startsWith('/employees/')) table = 'employees';
    else if (path.startsWith('/stock-movements/')) table = 'stock_movements';
    else if (/\/fuel-logs\//.test(path)) {
      table = 'vehicle_fuel_logs';
      join = 'vehicle_id';
    } else if (/\/maintenance-logs\//.test(path)) {
      table = 'vehicle_maintenance_logs';
      join = 'vehicle_id';
    } else if (path.includes('/vehicles/')) table = 'vehicles';

    if (!table) return null;
    const sql = join
      ? `SELECT v.department_id FROM ${table} r JOIN vehicles v ON v.id = r.${join} WHERE r.id = $1 LIMIT 1`
      : `SELECT department_id FROM ${table} WHERE id = $1 LIMIT 1`;
    const rows = await this.dataSource.query(sql, [id]);
    return rows[0]?.department_id ?? null;
  }
}
