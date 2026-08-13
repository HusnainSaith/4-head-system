import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { User } from '../../modules/users/entities/user.entity';
import { seedDepartments } from './departments.seed';
import { seedChartOfAccounts } from './chart-of-accounts.seed';
import { seedExpenseCategories } from './expense-categories.seed';
import { seedSupplyWastageCustomers } from './supply-wastage-customers.seed';

export async function seed() {
  await AppDataSource.initialize();

  try {
    // Call all seeds using upsert pattern
    await seedDepartments(AppDataSource);
    await seedChartOfAccounts(AppDataSource);
    await seedExpenseCategories(AppDataSource);

    // Seed admin user (idempotent upsert keyed on email)
    const userRepo = AppDataSource.getRepository(User);
    const hash = await bcrypt.hash('Admin@123', 12);
    await userRepo.upsert(
      [
        userRepo.create({
          fullName: 'System Admin',
          email: 'admin@poultry.local',
          passwordHash: hash,
          role: 'owner' as any,
          isActive: true,
        }),
      ],
      ['email'],
    );

    await seedSupplyWastageCustomers(AppDataSource);

    console.log('✅ Seeding completed successfully!');
  } catch (e) {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }

  process.exit(0);
}

seed();
