import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

dotenv.config();

const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',

  // Discover entities regardless of whether a module keeps them in an
  // `entities` subdirectory or next to the module files. The previous glob
  // silently excluded Invoice and Notification at runtime.
  entities: [__dirname + '/../modules/**/*.entity.{ts,js}'],

  migrations: [__dirname + '/../../migrations/*.{ts,js}'],

  synchronize: false,

  logging: process.env.TYPEORM_LOGGING === 'true',
  namingStrategy: new SnakeNamingStrategy(),
});

export default databaseConfig;
