const { app, BrowserWindow, dialog } = require("electron");
const { fork } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

let database;
let backend;
let mainWindow;
let isQuitting = false;
let backendErrorTail = "";

function formatError(error) {
  if (error instanceof Error) return error.stack || error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error ?? "Unknown startup error");
  }
}

function log(message) {
  const logDir = app.getPath("userData");
  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(
    path.join(logDir, "4head-desktop.log"),
    `${new Date().toISOString()} ${message}\n`,
  );
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function waitForBackend(url, child) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 300_000;
    const check = () => {
      if (child.exitCode !== null) {
        const cause = backendErrorTail.trim();
        reject(
          new Error(
            `The local backend exited with code ${child.exitCode}.` +
              (cause ? `\n\n${cause}` : ""),
          ),
        );
        return;
      }
      http
        .get(url, (response) => {
          response.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() >= deadline) {
            reject(new Error("The local backend did not start within five minutes."));
          } else {
            setTimeout(check, 300);
          }
        });
    };
    check();
  });
}

async function startLocalServices() {
  log("[startup] Loading embedded PostgreSQL runtime");
  const EmbeddedPostgres = (await import("embedded-postgres")).default;
  log("[startup] Embedded PostgreSQL runtime loaded");
  const databasePort = await reservePort();
  const applicationPort = await reservePort();
  const databasePassword = crypto
    .createHash("sha256")
    .update(`${app.getPath("userData")}:4head-local-db`)
    .digest("hex");
  const databaseDir = path.join(app.getPath("userData"), "postgres-data");

  database = new EmbeddedPostgres({
    databaseDir,
    user: "postgres",
    password: databasePassword,
    port: databasePort,
    persistent: true,
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: (message) => log(`[postgres] ${message}`),
    onError: (error) => log(`[postgres:error] ${String(error)}`),
  });

  if (!fs.existsSync(path.join(databaseDir, "PG_VERSION"))) {
    log("[startup] Initializing local database");
    await database.initialise();
  } else {
    log("[startup] Reusing existing local database");
  }
  log("[startup] Starting local database");
  await database.start();
  log("[startup] Local database started");
  try {
    await database.createDatabase("4head_local");
  } catch (error) {
    if (!String(error).toLowerCase().includes("already exists")) throw error;
  }

  const backendDir = path.join(process.resourcesPath, "backend");
  const entry = path.join(backendDir, "dist", "src", "main.js");
  const jwtSecret = crypto
    .createHash("sha512")
    .update(`${databasePassword}:4head-jwt`)
    .digest("hex");

  backend = fork(entry, [], {
    cwd: backendDir,
    execPath: process.execPath,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_PATH: path.join(backendDir, "modules"),
      NODE_ENV: "desktop",
      PORT: String(applicationPort),
      DB_HOST: "127.0.0.1",
      DB_PORT: String(databasePort),
      DB_USERNAME: "postgres",
      DB_PASSWORD: databasePassword,
      DB_DATABASE: "4head_local",
      JWT_SECRET: jwtSecret,
      FRONTEND_URL: `http://127.0.0.1:${applicationPort}`,
      FRONTEND_URLS: `http://127.0.0.1:${applicationPort}`,
      DESKTOP_FRONTEND_DIR: path.join(process.resourcesPath, "frontend"),
      UPLOAD_DIR: path.join(app.getPath("userData"), "uploads"),
      DESKTOP_AUTO_MIGRATE: "true",
      DESKTOP_AUTO_SEED: "true",
      NOTIFICATION_ENABLED: "false",
      TYPEORM_LOGGING: "false",
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  backend.stdout.on("data", (data) => log(`[backend] ${data}`));
  backend.stderr.on("data", (data) => {
    const message = String(data);
    backendErrorTail = `${backendErrorTail}${message}`.slice(-4000);
    log(`[backend:error] ${message}`);
  });

  const url = `http://127.0.0.1:${applicationPort}`;
  await waitForBackend(url, backend);
  return url;
}

async function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#111827",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  await mainWindow.loadURL(url);
}

function waitForExit(child, timeoutMs) {
  if (!child || child.exitCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);
    const onExit = () => {
      cleanup();
      resolve(true);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      child.off("exit", onExit);
    };
    child.once("exit", onExit);
  });
}

async function shutdown() {
  if (isQuitting) return;
  isQuitting = true;
  if (backend && backend.exitCode === null) {
    backend.send({ type: "shutdown" });
    if (!(await waitForExit(backend, 15_000))) {
      backend.kill();
      await waitForExit(backend, 5_000);
    }
  }
  if (database) {
    await database.stop().catch((error) => log(`[shutdown] ${String(error)}`));
  }
  log("[shutdown] Local services stopped");
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

app.on("before-quit", (event) => {
  if (!isQuitting) {
    event.preventDefault();
    void shutdown().finally(() => app.quit());
  }
});

app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) return;
  try {
    log("[startup] Electron is ready");
    const url = await startLocalServices();
    await createWindow(url);
    const testQuitDelay = Number(process.env.FOURHEAD_TEST_AUTO_QUIT_MS || 0);
    if (testQuitDelay > 0) {
      setTimeout(() => app.quit(), testQuitDelay);
    }
  } catch (error) {
    const details = formatError(error);
    log(`[startup:fatal] ${details}`);
    dialog.showErrorBox(
      "4Head Poultry ERP could not start",
      `${details}\n\nDiagnostic log:\n${path.join(app.getPath("userData"), "4head-desktop.log")}`,
    );
    await shutdown();
    app.quit();
  }
});

app.on("window-all-closed", () => app.quit());
