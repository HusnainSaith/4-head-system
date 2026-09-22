const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const desktopDir = __dirname;
const workspaceDir = path.resolve(desktopDir, "..");
const backendDir = path.join(workspaceDir, "4_Head_poltary_system");
const frontendDir = path.join(workspaceDir, "4Head_frontend");
const runtimeDir = path.join(desktopDir, "runtime");
const runtimeBackend = path.join(runtimeDir, "backend");

function run(command, args, cwd, env = process.env) {
  console.log(`> ${command} ${args.join(" ")}`);
  execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", command, ...args], {
    cwd, env, stdio: "inherit",
  });
}

function exportDirectorySnapshot() {
  const dotenv = require(path.join(backendDir, "node_modules", "dotenv"));
  const databaseEnv = dotenv.parse(fs.readFileSync(path.join(backendDir, ".env"), "utf8"));
  const postgresBin = "C:\\Program Files\\PostgreSQL\\17\\bin";
  const connectionArgs = [
    "--host", databaseEnv.DB_HOST || "localhost", "--port", databaseEnv.DB_PORT || "5432",
    "--username", databaseEnv.DB_USERNAME || "postgres",
    "--dbname", databaseEnv.DB_DATABASE || databaseEnv.DB_NAME || "postgres",
  ];
  const commandEnv = { ...process.env, PGPASSWORD: databaseEnv.DB_PASSWORD || "" };
  const plainSql = path.join(runtimeBackend, "initial-directory.sql");
  execFileSync(path.join(postgresBin, "pg_dump.exe"), [
    ...connectionArgs, "--data-only", "--inserts", "--no-owner", "--no-privileges",
    "--table=users", "--table=parties", "--table=party_departments",
    "--table=user_permissions", "--file", plainSql,
  ], { env: commandEnv, stdio: ["ignore", "inherit", "inherit"] });
  fs.writeFileSync(path.join(runtimeBackend, "initial-directory.sql.gz"),
    zlib.gzipSync(fs.readFileSync(plainSql), { level: 9 }));
  fs.rmSync(plainSql, { force: true });
  const mappingSql = `select json_build_object(
    'users', (select count(*) from users), 'parties', (select count(*) from parties),
    'roles', (select json_object_agg(name,id) from roles),
    'departments', (select json_object_agg(type,id) from departments))`;
  const manifest = execFileSync(path.join(postgresBin, "psql.exe"), [
    ...connectionArgs, "--tuples-only", "--no-align", "--command", mappingSql,
  ], { env: commandEnv, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
  fs.writeFileSync(path.join(runtimeBackend, "initial-directory-manifest.json"), `${manifest}\n`);
}

fs.rmSync(runtimeDir, { recursive: true, force: true });
fs.mkdirSync(runtimeBackend, { recursive: true });
run("npm.cmd", ["run", "build"], backendDir);
run("npm.cmd", ["run", "build"], frontendDir, { ...process.env, VITE_API_BASE_URL: "" });
for (const file of ["package.json", "package-lock.json"]) {
  fs.copyFileSync(path.join(backendDir, file), path.join(runtimeBackend, file));
}
fs.cpSync(path.join(backendDir, "dist"), path.join(runtimeBackend, "dist"), { recursive: true });
exportDirectorySnapshot();
run("npm.cmd", ["ci", "--omit=dev", "--ignore-scripts"], runtimeBackend);
fs.renameSync(path.join(runtimeBackend, "node_modules"), path.join(runtimeBackend, "modules"));
fs.cpSync(path.join(frontendDir, "dist"), path.join(runtimeDir, "frontend"), { recursive: true });
console.log("Desktop runtime prepared with the current users and parties.");
