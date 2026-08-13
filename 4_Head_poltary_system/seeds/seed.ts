import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../src/config/data-source';
import { User } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/modules/roles/entities/role.entity';
import { seedDepartments } from './departments.seed';
import { seedChartOfAccounts } from './chart-of-accounts.seed';
import { seedExpenseCategories } from './expense-categories.seed';
import { seedSupplyWastageCustomers } from '../src/database/seeds/supply-wastage-customers.seed';

export async function seed() {
  await AppDataSource.initialize();

  try {
    // Call all seeds using upsert pattern
    await seedDepartments(AppDataSource);
    await seedChartOfAccounts(AppDataSource);
    await seedExpenseCategories(AppDataSource);

    // Seed roles — names must match frontend Role enum exactly
    const roleRepo = AppDataSource.getRepository(Role);
    const roleDefinitions = [
      { name: 'owner', description: 'Full system access' },
      { name: 'accountant', description: 'Financial read/write access' },
      { name: 'department_staff', description: 'Department-scoped access' },
      { name: 'employee', description: 'Employee self-service access' },
    ];
    await roleRepo.upsert(roleDefinitions, ['name']);
    const ownerRole = await roleRepo.findOne({ where: { name: 'owner' } });

    await seedSupplyWastageCustomers(AppDataSource);

    // Seed admin user — always ensure role_id points to owner
    const userRepo = AppDataSource.getRepository(User);
    const admin = await userRepo.findOne({
      where: { email: 'admin@poultry.local' },
    });
    if (!admin) {
      const hash = await bcrypt.hash('Admin@123', 12);
      await userRepo.save(
        userRepo.create({
          fullName: 'System Admin',
          email: 'admin@poultry.local',
          passwordHash: hash,
          roleId: ownerRole?.id,
          isActive: true,
        }),
      );
    } else if (ownerRole && admin.roleId !== ownerRole.id) {
      await userRepo.update({ id: admin.id }, { roleId: ownerRole.id });
    }

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
