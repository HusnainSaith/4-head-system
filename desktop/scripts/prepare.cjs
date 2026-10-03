const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");


const desktopDir = path.resolve(__dirname, "..");
const workspaceDir = path.resolve(desktopDir, "..");
const backendDir = path.join(workspaceDir, "4_Head_poltary_system");
const frontendDir = path.join(workspaceDir, "4Head_frontend");
const runtimeDir = path.join(desktopDir, "runtime");
const runtimeBackend = path.join(runtimeDir, "backend");
const preserveDatabase = process.argv.includes("--preserve-database");

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
  execFileSync(process.execPath, [path.join(__dirname, 'snapshot.cjs'), runtimeBackend], { stdio: 'inherit' });
}

if (runtimeDir !== path.resolve(workspaceDir, "desktop/runtime")) throw new Error("Unsafe runtime path");
if (preserveDatabase) {
  for (const file of ["initial-database.sql.gz", "initial-database-manifest.json", "modules"]) {
    if (!fs.existsSync(path.join(runtimeBackend, file))) throw new Error(`Missing existing runtime ${file}; cannot build a database-preserving update`);
  }
} else {
  fs.rmSync(runtimeDir, { recursive: true, force: true });
  fs.mkdirSync(runtimeBackend, { recursive: true });
}

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

if (!preserveDatabase) exportDatabaseSnapshot();

if (!preserveDatabase) {
  run("npm.cmd", ["ci", "--omit=dev", "--ignore-scripts"], runtimeBackend);
  fs.renameSync(
  path.join(runtimeBackend, "node_modules"),
  path.join(runtimeBackend, "modules"),
);
}
fs.cpSync(path.join(frontendDir, "dist"), path.join(runtimeDir, "frontend"), {
  recursive: true,
});

console.log(preserveDatabase ? "Desktop application updated; database snapshot and uploads unchanged." : "Desktop runtime prepared with all current database records.");
