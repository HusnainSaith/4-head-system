import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const SyncDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT!, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || process.env.DB_NAME,
  entities: ['src/modules/**/*.entity.ts'],
  synchronize: true,
  logging: false,
  namingStrategy: new SnakeNamingStrategy(),
});

SyncDataSource.initialize()
  .then(() => {
    console.log('✅ Schema synchronized successfully!');
    return SyncDataSource.destroy();
  })
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Sync failed:', e.message);
    process.exit(1);
  });
