const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const desktopDir = path.resolve(__dirname, "..");
const workspaceDir = path.resolve(desktopDir, "..");
const backendDir = path.join(workspaceDir, "4_Head_poltary_system");
const frontendDir = path.join(workspaceDir, "4Head_frontend");
const runtimeDir = path.join(desktopDir, "runtime");
const runtimeBackend = path.join(runtimeDir, "backend");

function run(command, args, cwd, env = process.env) {
  console.log(`> ${command} ${args.join(" ")}`);
  execFileSync(process.env.ComSpec || "cmd.exe", [
    "/d",
    "/s",
    "/c",
    command,
    ...args,
  ], { cwd, env, stdio: "inherit" });
}

function exportDatabaseSnapshot() {
  const dotenv = require(path.join(backendDir, "node_modules", "dotenv"));
  const databaseEnv = dotenv.parse(
    fs.readFileSync(path.join(backendDir, ".env"), "utf8"),
  );
  const postgresBin =
    databaseEnv.POSTGRES_BIN || "C:\\Program Files\\PostgreSQL\\17\\bin";
  const connectionArgs = [
    "--host", databaseEnv.DB_HOST || "localhost",
    "--port", databaseEnv.DB_PORT || "5432",
    "--username", databaseEnv.DB_USERNAME || "postgres",
    "--dbname", databaseEnv.DB_DATABASE || databaseEnv.DB_NAME || "postgres",
  ];
  const commandEnv = {
    ...process.env,
    PGPASSWORD: databaseEnv.DB_PASSWORD || "",
  };
  const sqlPath = path.join(runtimeBackend, "initial-database.sql");
  const snapshotPath = `${sqlPath}.gz`;

  execFileSync(path.join(postgresBin, "pg_dump.exe"), [
    ...connectionArgs,
    "--data-only",
    "--column-inserts",
    "--disable-triggers",
    "--no-owner",
    "--no-privileges",
    "--exclude-table=migrations",
    "--file", sqlPath,
  ], { env: commandEnv, stdio: ["ignore", "inherit", "inherit"] });

  const sql = fs.readFileSync(sqlPath);
  const recordCount = (sql.toString('utf8').match(/^INSERT INTO /gm) || []).length;
  fs.writeFileSync(snapshotPath, zlib.gzipSync(sql, { level: 9 }));
  fs.rmSync(sqlPath, { force: true });

  const summarySql = `select json_build_object(
    'snapshotVersion', 1,
    'exportedAt', now(),
    'tables', (select count(*) from information_schema.tables where table_schema = 'public'),
    'users', (select count(*) from users),
    'parties', (select count(*) from parties))`;
  const manifest = JSON.parse(execFileSync(path.join(postgresBin, "psql.exe"), [
    ...connectionArgs,
    "--tuples-only",
    "--no-align",
    "--command", summarySql,
  ], { env: commandEnv, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim());
  manifest.records = recordCount;
  manifest.compressedBytes = fs.statSync(snapshotPath).size;
  fs.writeFileSync(
    path.join(runtimeBackend, "initial-database-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(
    `Database snapshot compressed to ${fs.statSync(snapshotPath).size} bytes.`,
  );
}

fs.rmSync(runtimeDir, { recursive: true, force: true });
fs.mkdirSync(runtimeBackend, { recursive: true });

run("npm.cmd", ["run", "build"], backendDir);
run("npm.cmd", ["run", "build"], frontendDir, {
  ...process.env,
  VITE_API_BASE_URL: "",
});

for (const file of ["package.json", "package-lock.json"]) {
  fs.copyFileSync(path.join(backendDir, file), path.join(runtimeBackend, file));
}
fs.cpSync(path.join(backendDir, "dist"), path.join(runtimeBackend, "dist"), {
  recursive: true,
});

exportDatabaseSnapshot();

run("npm.cmd", ["ci", "--omit=dev", "--ignore-scripts"], runtimeBackend);
fs.renameSync(
  path.join(runtimeBackend, "node_modules"),
  path.join(runtimeBackend, "modules"),
);
fs.cpSync(path.join(frontendDir, "dist"), path.join(runtimeDir, "frontend"), {
  recursive: true,
});

console.log("Desktop runtime prepared with all current database records.");
