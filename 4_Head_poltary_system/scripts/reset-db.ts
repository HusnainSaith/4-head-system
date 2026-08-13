import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

async function resetDb() {
  // Step 1: connect without entities to drop everything
  const rawDs = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT!, 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || process.env.DB_NAME,
    synchronize: false,
    logging: false,
  });

  await rawDs.initialize();

  // Drop all tables in public schema
  await rawDs.query(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  // Drop all enum types
  await rawDs.query(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  console.log('✅ All tables and enums dropped');
  await rawDs.destroy();

  // Step 2: reconnect with entities and synchronize
  const syncDs = new DataSource({
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

  await syncDs.initialize();
  console.log('✅ Schema recreated from entities');
  await syncDs.destroy();
}

resetDb()
  .then(() => {
    console.log('✅ DB reset complete! Now run: npm run seed');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ Reset failed:', e.message);
    process.exit(1);
  });
