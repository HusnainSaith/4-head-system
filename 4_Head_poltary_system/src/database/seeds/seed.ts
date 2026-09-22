import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { User } from '../../modules/users/entities/user.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { seedDepartments } from './departments.seed';
import { seedChartOfAccounts } from './chart-of-accounts.seed';
import { seedExpenseCategories } from './expense-categories.seed';
import { seedSupplyWastageCustomers } from './supply-wastage-customers.seed';
import { seedWastageShopOwners } from './wastage-shop-owners.seed';
import { seedBrokerageParties } from './brokerage-parties.seed';

export async function dropStalePartyUniqueConstraints() {
  const constraints = (await AppDataSource.query(
    `SELECT conname
     FROM pg_constraint
     WHERE conrelid = 'parties'::regclass
       AND contype = 'u'
       AND (
         pg_get_constraintdef(oid) ILIKE '%(name)%'
         OR pg_get_constraintdef(oid) ILIKE '%(user_id)%'
       )`,
  )) ?? [];

  for (const row of constraints) {
    await AppDataSource.query(
      `ALTER TABLE "parties" DROP CONSTRAINT IF EXISTS "${row.conname}"`,
    );
  }

  const indexes = (await AppDataSource.query(
    `SELECT indexname
     FROM pg_indexes
     WHERE tablename = 'parties'
       AND (
         indexname ILIKE '%name%'
         OR indexname ILIKE '%user_id%'
         OR indexdef ILIKE '%(name)%'
         OR indexdef ILIKE '%(user_id)%'
       )`,
  )) ?? [];

  for (const row of indexes) {
    await AppDataSource.query(
      `DROP INDEX IF EXISTS "${row.indexname}"`,
    );
  }
}

export async function seed() {
  await AppDataSource.initialize();

  try {
    await dropStalePartyUniqueConstraints();

    // Call all seeds using upsert pattern
    await seedDepartments(AppDataSource);
    await seedChartOfAccounts(AppDataSource);
    await seedExpenseCategories(AppDataSource);

    const roleRepo = AppDataSource.getRepository(Role);
    await roleRepo.upsert(
      [
        { name: 'owner', description: 'Full system access' },
        { name: 'accountant', description: 'Financial read/write access' },
        { name: 'department_staff', description: 'Department-scoped access' },
        { name: 'employee', description: 'Employee self-service access' },
        { name: 'SHOP_OWNER', description: 'Shop owner party' },
        { name: 'PARTY', description: 'External business party' },
      ],
      ['name'],
    );

    // Seed admin user (idempotent upsert keyed on email)
    const userRepo = AppDataSource.getRepository(User);
    const ownerRole = await roleRepo.findOneBy({ name: 'owner' });
    if (!ownerRole) {
      throw new Error('Owner role not found during seed');
    }

    const hash = await bcrypt.hash('Admin@123', 12);
    await userRepo.upsert(
      [
        userRepo.create({
          fullName: 'System Admin',
          email: 'admin@poultry.local',
          passwordHash: hash,
          roleId: ownerRole.id,
          isActive: true,
        }),
      ],
      ['email'],
    );

    await seedSupplyWastageCustomers(AppDataSource);
    await seedBrokerageParties(AppDataSource);
    await seedWastageShopOwners(AppDataSource);

    console.log('✅ Seeding completed successfully!');
  } catch (e) {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }

  process.exit(0);
}

if (require.main === module) {
  seed();
}
