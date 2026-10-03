const { app, BrowserWindow, dialog } = require("electron");
const { fork, execFile } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { registerZoomShortcuts } = require("./zoom-shortcuts.cjs");

let database;
let databaseControlBinary;
let databaseDirectory;
let backend;
let mainWindow;
let isQuitting = false;
let backendErrorTail = "";
let pendingSnapshotState;

function formatError(error) {
  if (error instanceof Error) return error.stack || error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error ?? "Unknown startup error");
  }
}

let logStream;
function log(message) {
  if (!logStream) {
    const logDir = app.getPath('userData');
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, '4head-desktop.log');
    if (fs.existsSync(logPath) && fs.statSync(logPath).size > 20 * 1024 * 1024) fs.renameSync(logPath, logPath + '.' + Date.now());
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    logStream.on('error', (error) => console.error('Desktop log error:', error.message));
  }
  logStream.write(new Date().toISOString() + ' ' + message + '\n');
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

function prepareSnapshotUpgrade(databaseDir, backendDir) {
  // Application updates must never replace an existing business database.
  if (fs.existsSync(path.join(databaseDir, "PG_VERSION"))) return null;
  const manifestPath = path.join(
    backendDir,
    "initial-database-manifest.json",
  );
  if (!fs.existsSync(manifestPath)) return null;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const generation = String(manifest.snapshotVersion || 1);
  const statePath = path.join(app.getPath("userData"), "snapshot-state.json");
  const state = fs.existsSync(statePath)
    ? JSON.parse(fs.readFileSync(statePath, "utf8"))
    : null;
  if (state?.generation === generation && state?.status === "complete") {
    return null;
  }
  if (state?.generation === generation && state?.status === "upgrading") {
    return { generation, statePath, manifest, backupDir: state.backupDir };
  }

  let backupDir = null;
  if (fs.existsSync(path.join(databaseDir, "postmaster.pid"))) {
    const oldPid = Number(fs.readFileSync(path.join(databaseDir, "postmaster.pid"), "utf8").split(/\r?\n/)[0]);
    let running = true;
    try { process.kill(oldPid, 0); } catch (error) { if (error.code === "ESRCH") running = false; }
    if (running) throw new Error("The desktop database may still be running. Close the old desktop application before upgrading.");
  }
  if (fs.existsSync(path.join(databaseDir, "PG_VERSION"))) {
    const backupRoot = path.join(app.getPath("userData"), "database-backups");
    fs.mkdirSync(backupRoot, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupDir = path.join(backupRoot, `postgres-data-before-snapshot-${timestamp}`);
    fs.renameSync(databaseDir, backupDir);
    log(`[snapshot] Previous desktop database backed up to ${backupDir}`);
  }
  const upgradingState = {
    generation,
    status: "upgrading",
    startedAt: new Date().toISOString(),
    backupDir,
  };
  fs.writeFileSync(statePath, `${JSON.stringify(upgradingState, null, 2)}\n`);
  return { generation, statePath, manifest, backupDir };
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
      const request = http
        .get(url, (response) => {
          response.resume();
          if (response.statusCode >= 200 && response.statusCode < 400) resolve();
          else if (Date.now() >= deadline) reject(new Error('Backend readiness check failed'));
          else setTimeout(check, 300);
        })
        .on("error", () => {
          if (Date.now() >= deadline) {
            reject(new Error("The local backend did not start within five minutes."));
          } else {
            setTimeout(check, 300);
          }
        });
      request.setTimeout(3000, () => request.destroy(new Error("Backend readiness request timed out")));
    };
    check();
  });
}

async function startLocalServices() {
  log("[startup] Loading embedded PostgreSQL runtime");
  const EmbeddedPostgres = (await import("embedded-postgres")).default;
  databaseControlBinary = (await import("@embedded-postgres/windows-x64")).pg_ctl;
  log("[startup] Embedded PostgreSQL runtime loaded");
  const databasePort = await reservePort();
  const applicationPort = await reservePort();
  const databasePassword = crypto
    .createHash("sha256")
    .update(`${app.getPath("userData")}:4head-local-db`)
    .digest("hex");
  const databaseDir = path.join(app.getPath("userData"), "postgres-data");
  databaseDirectory = databaseDir;
  const backendDir = path.join(process.resourcesPath, "backend");
  pendingSnapshotState = prepareSnapshotUpgrade(databaseDir, backendDir);
  if (fs.existsSync(path.join(databaseDir, 'PG_VERSION'))) {
    const backupPath = path.join(app.getPath('userData'), 'database-backups', 'before-app-' + app.getVersion());
    if (!fs.existsSync(backupPath)) {
      fs.cpSync(databaseDir, backupPath, { recursive: true, filter: (file) => path.basename(file) !== 'postmaster.pid' });
      log('[upgrade] Existing database backed up before application upgrade');
    }
  }

  database = new EmbeddedPostgres({
    databaseDir,
    user: "postgres",
    password: databasePassword,
    port: databasePort,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
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

  if (pendingSnapshotState) {
    const initialUploads = path.join(backendDir, "initial-uploads");
    if (fs.existsSync(initialUploads)) {
      fs.cpSync(initialUploads, path.join(app.getPath("userData"), "uploads"), { recursive: true, force: false });
    }
  }

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
      DESKTOP_AUTO_MIGRATE: pendingSnapshotState ? "true" : "false",
      DESKTOP_SCHEMA_UPGRADE: "true",
      DESKTOP_AUTO_SEED: pendingSnapshotState ? "true" : "false",
      NOTIFICATION_ENABLED: "false",
      DISABLE_EMAIL_DELIVERY: "true",
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
  if (pendingSnapshotState) {
    fs.writeFileSync(
      pendingSnapshotState.statePath,
      `${JSON.stringify({
        generation: pendingSnapshotState.generation,
        status: "complete",
        importedAt: new Date().toISOString(),
        records: pendingSnapshotState.manifest.records,
        users: pendingSnapshotState.manifest.users,
        parties: pendingSnapshotState.manifest.parties,
        backupDir: pendingSnapshotState.backupDir || null,
      }, null, 2)}\n`,
    );
    log(`[snapshot] Generation ${pendingSnapshotState.generation} imported successfully`);
  }
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
      backgroundThrottling: false,
    },
  });
  registerZoomShortcuts(mainWindow.webContents);
  let recoveryPromptOpen = false;
  let rendererUnresponsive = false;
  mainWindow.on('responsive', () => { rendererUnresponsive = false; });
  const offerRecovery = async (crashed = false) => {
    if (recoveryPromptOpen || isQuitting) return;
    recoveryPromptOpen = true;
    try {
      const result = await dialog.showMessageBox(mainWindow, { type: 'warning', title: '4Head needs attention', message: crashed ? 'The application page stopped unexpectedly.' : 'The application page is taking longer than expected.', detail: 'Wait to keep your current page, or reload the page. Saved database records are retained. Unsaved form changes may be lost on reload.', buttons: ['Wait', 'Reload page'], defaultId: 0, cancelId: 0 });
      if (result.response === 1 && (crashed || rendererUnresponsive) && !mainWindow.isDestroyed()) mainWindow.webContents.reload();
    } finally { recoveryPromptOpen = false; }
  };
  mainWindow.on('unresponsive', () => { rendererUnresponsive = true; log('[renderer] Unresponsive'); void offerRecovery(); });
  mainWindow.webContents.on('render-process-gone', (_event, details) => { log('[renderer] Process ended: ' + details.reason); void offerRecovery(true); });
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
    try {
      await new Promise((resolve, reject) => execFile(databaseControlBinary, ['stop', '-D', databaseDirectory, '-m', 'fast', '-w', '-t', '15'], { windowsHide: true, timeout: 20000 }, (error) => error ? reject(error) : resolve()));
      database.process = undefined;
      await database.stop();
    } catch (error) {
      log('[shutdown] Graceful database stop failed: ' + String(error));
      await Promise.race([database.stop(), new Promise(resolve => setTimeout(resolve, 5000))]);
    }
  }
  log("[shutdown] Local services stopped");
  if (logStream) await new Promise(resolve => logStream.end(resolve));
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
    if (process.env.FOURHEAD_TEST_SKIP_WINDOW !== "true") await createWindow(url);
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
