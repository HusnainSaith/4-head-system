const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function startup(existing, missingEntry = false) {
  const calls = { initialise: 0, createDatabase: 0, start: 0, env: null, writes: [] };
  class EmbeddedPostgres {
    async initialise() { calls.initialise++; }
    async start() { calls.start++; }
    async createDatabase() { calls.createDatabase++; }
  }
  const fileSystem = {
    existsSync: file => path.basename(file) === 'main.js' ? !missingEntry : path.basename(file) === 'PG_VERSION' ? existing : path.basename(file) === 'initial-database-manifest.json' || file.includes('before-app-'),
    readFileSync: () => JSON.stringify({ snapshotVersion: 'preserved-snapshot', records: 0 }),
    writeFileSync: file => calls.writes.push(file),
  };
  const app = { getPath: () => 'C:\\MockUserData', getVersion: () => '1.0.13', requestSingleInstanceLock: () => true, on() {}, whenReady: () => ({ then() {} }) };
  const source = fs.readFileSync(path.resolve(__dirname, '../main.cjs'), 'utf8')
    .replace('(await import("embedded-postgres")).default', 'mocks.EmbeddedPostgres')
    .replace('(await import("@embedded-postgres/windows-x64")).pg_ctl', '"mock-pg-ctl"');
  const context = {
    mocks: { EmbeddedPostgres }, module: { exports: {} }, __dirname: path.resolve(__dirname, '..'),
    process: { resourcesPath: 'C:\\MockResources', execPath: 'mock-electron', env: {} }, console,
    require: name => {
      if (name === 'electron') return { app };
      if (name === 'node:fs') return fileSystem;
      if (name === './zoom-shortcuts.cjs') return { registerZoomShortcuts() {} };
      if (name === 'node:child_process') return { fork: (_entry, _args, options) => { calls.env = options.env; return { stdout: { on() {} }, stderr: { on() {} } }; } };
      return require(name);
    },
  };
  vm.runInNewContext(source + '\nlog = () => {}; reservePort = async () => 12345; waitForBackend = async () => {}; module.exports = { startLocalServices };', context);
  await context.module.exports.startLocalServices();
  return calls;
}

test('existing desktops never initialise, create databases, migrate, upgrade schema, or seed during an app update', async () => {
  const calls = await startup(true);
  assert.equal(calls.initialise, 0);
  assert.equal(calls.createDatabase, 0);
  assert.equal(calls.start, 1);
  for (const flag of ['DESKTOP_AUTO_MIGRATE', 'DESKTOP_SCHEMA_UPGRADE', 'DESKTOP_AUTO_SEED']) assert.equal(calls.env[flag], 'false');
  assert.equal(calls.writes.length, 0);
});

test('missing backend files fail before any database starts', async () => {
  await assert.rejects(startup(true, true), /Application files are missing/);
});

test('portable launches use independent extraction folders with the installed builder', () => {
  const options = require('../package.json').build.portable;
  // Builder 26.15 generates a shared folder for false/undefined; true omits
  // UNPACK_DIR_NAME so portable.nsi uses the per-launch $PLUGINSDIR.
  assert.equal(options.unpackDirName, true);
  assert.equal(typeof options.unpackDirName === 'string' || !options.unpackDirName, false);
});

test('first installations retain the existing snapshot import path', async () => {
  const calls = await startup(false);
  assert.equal(calls.initialise, 1);
  assert.equal(calls.createDatabase, 1);
  assert.equal(calls.env.DESKTOP_AUTO_MIGRATE, 'true');
  assert.equal(calls.env.DESKTOP_AUTO_SEED, 'true');
  assert.equal(calls.env.DESKTOP_SCHEMA_UPGRADE, 'false');
});
