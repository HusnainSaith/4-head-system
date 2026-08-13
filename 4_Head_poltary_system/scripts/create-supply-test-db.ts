import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  const sourceName = process.env.DB_NAME ?? process.env.DB_DATABASE ?? 'poultry';
  const database = `${sourceName}_supply_test`.replace(/[^a-zA-Z0-9_]/g, '_');
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });
  await client.connect();
  try {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (!found.rowCount) await client.query(`CREATE DATABASE "${database}"`);
    process.stdout.write(database);
  } finally {
    await client.end();
  }
}

void main();
