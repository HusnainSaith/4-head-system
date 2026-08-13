import 'dotenv/config';
import { Client } from 'pg';

const action = process.argv[2];
const database = process.argv[3] ?? '4head_test';
const sourceDatabase = process.argv[4];

if (!/^[a-z0-9_]+$/i.test(database) || !database.toLowerCase().includes('test')) {
  throw new Error('Disposable database names must contain "test"');
}
if (action !== 'create' && action !== 'drop' && action !== 'clone') {
  throw new Error('Usage: test-database.ts <create|drop|clone> [database] [source]');
}

async function main(): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });
  await client.connect();
  const exists = await client.query('select 1 from pg_database where datname = $1', [database]);
  if (action === 'create' && exists.rowCount === 0) {
    await client.query(`create database "${database}"`);
  }
  if (action === 'clone' && exists.rowCount === 0) {
    if (!sourceDatabase || !/^[a-z0-9_]+$/i.test(sourceDatabase)) {
      throw new Error('Clone requires a valid source database name');
    }
    if (!['localhost', '127.0.0.1'].includes(process.env.DB_HOST ?? '')) {
      throw new Error('Database cloning is restricted to localhost');
    }
    await client.query(
      'select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()',
      [sourceDatabase],
    );
    await client.query(`create database "${database}" with template "${sourceDatabase}"`);
  }
  if (action === 'drop' && exists.rowCount !== 0) {
    await client.query(
      'select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()',
      [database],
    );
    await client.query(`drop database "${database}"`);
  }
  await client.end();
  process.stdout.write(`${action} ${database}: complete\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Database operation failed'}\n`);
  process.exitCode = 1;
});
