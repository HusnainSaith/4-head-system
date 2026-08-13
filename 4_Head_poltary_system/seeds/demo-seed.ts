import 'reflect-metadata';
import { AppDataSource } from '../src/config/data-source';
import { seedDemoBusinessData } from './demo-business.seed';

async function run() {
  await AppDataSource.initialize();
  try {
    const summary = await seedDemoBusinessData(AppDataSource);
    console.log('Demo business seeding completed:', summary);
  } finally {
    await AppDataSource.destroy();
  }
}

void run().catch((error: unknown) => {
  console.error('Demo business seeding failed:', error);
  process.exitCode = 1;
});
