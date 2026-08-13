import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../src/config/data-source';
import { User } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/modules/roles/entities/role.entity';
import { seedDepartments } from './departments.seed';
import { seedChartOfAccounts } from './chart-of-accounts.seed';
import { seedExpenseCategories } from './expense-categories.seed';
import { RoleEnum } from '../src/common/enums/role.enum';

export async function seed() {
  await AppDataSource.initialize();

  try {
    await seedDepartments(AppDataSource);
    await seedChartOfAccounts(AppDataSource);
    await seedExpenseCategories(AppDataSource);

    const roleRepo = AppDataSource.getRepository(Role);
    let ownerRole = await roleRepo.findOne({ where: { name: RoleEnum.OWNER } });
    if (!ownerRole) {
      ownerRole = roleRepo.create({ name: RoleEnum.OWNER, description: 'Owner role with full access' });
      await roleRepo.save(ownerRole);
      console.log('✅ Owner role created');
    } else {
      console.log('⏭️  Owner role already exists');
    }

    const userRepo = AppDataSource.getRepository(User);
    const adminEmail = 'admin@poultry.local';
    let adminUser = await userRepo.findOne({ where: { email: adminEmail } });

    if (!adminUser) {
      const password = await bcrypt.hash('Admin@123', 12);
      adminUser = userRepo.create({
        fullName: 'System Admin',
        email: adminEmail,
        passwordHash: password,
        isActive: true,
        roleId: ownerRole.id,
      });
      await userRepo.save(adminUser);
      console.log(`✅ Admin user "${adminEmail}" created`);
    } else {
      console.log(`⏭️  Admin user "${adminEmail}" already exists`);
    }

    console.log('✅ Seeding completed successfully!');
  } catch (e) {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('🆑 Database connection closed.');
  }

  process.exit(0);
}

seed();
