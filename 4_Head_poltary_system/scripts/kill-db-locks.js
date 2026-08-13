const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || process.env.DB_NAME,
  });

  await client.connect();

  const query = `
    SELECT
      pid,
      state,
      wait_event_type,
      wait_event,
      pg_terminate_backend(pid) AS terminated
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      AND (state = 'idle in transaction' OR wait_event_type = 'Lock')
  `;

  const result = await client.query(query);
  console.log(JSON.stringify(result.rows, null, 2));

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
