import * as bcrypt from 'bcryptjs';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { gunzipSync } from 'zlib';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Role } from '../modules/roles/entities/role.entity';
import { seedDepartments } from '../../seeds/departments.seed';
import { seedChartOfAccounts } from '../../seeds/chart-of-accounts.seed';
import { seedExpenseCategories } from '../../seeds/expense-categories.seed';
import { seedSupplyWastageCustomers } from './seeds/supply-wastage-customers.seed';

export async function prepareDesktopDatabase(
  dataSource: DataSource,
): Promise<void> {
  if (process.env.DESKTOP_AUTO_MIGRATE === 'true') {
    await dataSource.runMigrations({ transaction: 'each' });
  }
  if (process.env.DESKTOP_AUTO_SEED !== 'true') return;

  const [{ count: existingUsers }] = await dataSource.query<
    Array<{ count: string }>
  >('SELECT COUNT(*)::text AS count FROM users');
  if (Number(existingUsers) > 0) return;

  const snapshotPath = resolve(process.cwd(), 'initial-database.sql.gz');
  if (existsSync(snapshotPath)) {
    const snapshotSql = gunzipSync(readFileSync(snapshotPath))
      .toString('utf8')
      // PostgreSQL 17 adds psql-only safety commands to plain dumps.
      .replace(/^\\(?:un)?restrict\b.*$/gm, '');
    await dataSource.transaction(async (manager) => {
      const tables = await manager.query<Array<{ tableName: string }>>(`
        SELECT quote_ident(tablename) AS "tableName"
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename <> 'migrations'
      `);
      if (tables.length > 0) {
        await manager.query(
          `TRUNCATE TABLE ${tables.map(({ tableName }) => tableName).join(', ')} RESTART IDENTITY CASCADE`,
        );
      }
      await manager.query(snapshotSql);
      await manager.query('SET search_path TO public');
    });
    return;
  }

  await seedDepartments(dataSource);
  await seedChartOfAccounts(dataSource);
  await seedExpenseCategories(dataSource);

  const roleRepository = dataSource.getRepository(Role);
  await roleRepository.upsert(
    [
      { name: 'owner', description: 'Full system access' },
      { name: 'accountant', description: 'Financial read/write access' },
      {
        name: 'department_staff',
        description: 'Department-scoped access',
      },
      { name: 'employee', description: 'Employee self-service access' },
    ],
    ['name'],
  );
  const ownerRole = await roleRepository.findOneByOrFail({ name: 'owner' });

  await seedSupplyWastageCustomers(dataSource);

  const userRepository = dataSource.getRepository(User);
  const email = 'admin@poultry.local';
  const existingAdmin = await userRepository.findOne({ where: { email } });
  if (!existingAdmin) {
    await userRepository.save(
      userRepository.create({
        fullName: 'System Admin',
        email,
        passwordHash: await bcrypt.hash('Admin@123', 12),
        roleId: ownerRole.id,
        isActive: true,
      }),
    );
  }
}
