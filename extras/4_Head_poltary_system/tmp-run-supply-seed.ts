import 'reflect-metadata';
import { AppDataSource } from './src/config/data-source';
import { seedSupplyWastageCustomers } from './src/database/seeds/supply-wastage-customers.seed';

async function main() {
  await AppDataSource.initialize();
  try {
    console.log('=== Running seedSupplyWastageCustomers only ===');
    await seedSupplyWastageCustomers(AppDataSource);
    console.log('=== DONE ===');
  } catch (e) {
    console.error('❌ SEED ERROR:', e);
    process.exitCode = 1;
  } finally {
    await AppDataSource.destroy();
  }
}

main();