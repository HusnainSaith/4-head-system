const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

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

run("npm.cmd", ["ci", "--omit=dev", "--ignore-scripts"], runtimeBackend);
fs.renameSync(
  path.join(runtimeBackend, "node_modules"),
  path.join(runtimeBackend, "modules"),
);
fs.cpSync(path.join(frontendDir, "dist"), path.join(runtimeDir, "frontend"), {
  recursive: true,
});

console.log("Desktop runtime prepared.");
