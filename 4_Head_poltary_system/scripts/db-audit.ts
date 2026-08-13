import 'dotenv/config';
import { Client } from 'pg';

async function main(): Promise<void> {
  const database = process.argv[2] ?? process.env.DB_DATABASE ?? process.env.DB_NAME;
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database,
  });
  await client.connect();
  const queries = [
    'select version(), current_database() db',
    "select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'roles' order by ordinal_position",
    "select to_regclass('public.migrations') migration_table",
    "select count(*)::int migration_count from migrations",
    'select id, name from roles order by name, id',
  ];
  for (const query of queries) {
    const result = await client.query(query);
    process.stdout.write(`${JSON.stringify(result.rows, null, 2)}\n`);
  }
  await client.end();
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Database audit failed';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
