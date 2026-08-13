import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
dotenv.config();

const databaseName = process.env.DB_DATABASE || process.env.DB_NAME;
if (
  process.env.NODE_ENV === 'test' &&
  (!databaseName || !databaseName.toLowerCase().includes('test'))
) {
  throw new Error('Tests must use a database name containing "test"');
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT!, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: databaseName,
  entities: ['src/modules/**/*.entity.ts'],

  migrations: ['migrations/*.ts'],
  synchronize: false,
  logging: true,
  namingStrategy: new SnakeNamingStrategy(),
});
