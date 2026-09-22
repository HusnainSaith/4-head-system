import 'reflect-metadata';
import { AppDataSource } from '../../config/data-source';
import { Role } from '../../modules/roles/entities/role.entity';
import { seedWastageShopOwners } from './wastage-shop-owners.seed';

async function run() {
  await AppDataSource.initialize();
  try {
    await AppDataSource.getRepository(Role).upsert(
      [{ name: 'SHOP_OWNER', description: 'Shop owner party' }],
      ['name'],
    );
    await seedWastageShopOwners(AppDataSource);
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((error) => {
  console.error('Wastage shop-owner seed failed:', error);
  process.exitCode = 1;
});
