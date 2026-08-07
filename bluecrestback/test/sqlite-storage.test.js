const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');

function inspectStorage(extraEnv = {}) {
    return spawnSync(
        process.execPath,
        ['-e', "console.log(JSON.stringify(require('./src/database/sqlite-path')))"],
        {
            cwd: projectRoot,
            encoding: 'utf8',
            env: {
                ...process.env,
                NODE_ENV: 'production',
                DB_PROVIDER: 'sqlite',
                RAILWAY_PROJECT_ID: 'test-project',
                SQLITE_DB_PATH: '',
                RAILWAY_VOLUME_MOUNT_PATH: '',
                ...extraEnv
            }
        }
    );
}

test('Railway production refuses ephemeral SQLite when no volume is mounted', () => {
    const result = inspectStorage();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no Railway volume is attached/);
});

test('Railway production accepts SQLite inside its mounted volume', () => {
    const volume = fs.mkdtempSync(path.join(os.tmpdir(), 'bluecrest-volume-'));
    try {
        const databasePath = path.join(volume, 'local.db');
        const result = inspectStorage({
            RAILWAY_VOLUME_MOUNT_PATH: volume,
            SQLITE_DB_PATH: databasePath
        });
        assert.equal(result.status, 0, result.stderr);
        const storage = JSON.parse(result.stdout.trim());
        assert.equal(storage.databasePath, databasePath);
        assert.equal(storage.persistent, true);
        assert.equal(storage.storageMode, 'railway-volume');
    } finally {
        fs.rmSync(volume, { recursive: true, force: true });
    }
});

test('Railway production rejects a SQLite path outside its mounted volume', () => {
    const volume = fs.mkdtempSync(path.join(os.tmpdir(), 'bluecrest-volume-'));
    try {
        const result = inspectStorage({
            RAILWAY_VOLUME_MOUNT_PATH: volume,
            SQLITE_DB_PATH: path.resolve(volume, '..', 'ephemeral.db')
        });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /outside Railway volume/);
    } finally {
        fs.rmSync(volume, { recursive: true, force: true });
    }
});

test('managed Postgres is persistent and does not require a Railway volume', () => {
    const result = spawnSync(
        process.execPath,
        ['-e', "const db=require('./src/database/db'); console.log(JSON.stringify({provider:db.PROVIDER,persistent:db.IS_PERSISTENT,mode:db.STORAGE_MODE,location:db.DATABASE_LOCATION})); db.close()"],
        {
            cwd: projectRoot,
            encoding: 'utf8',
            env: {
                ...process.env,
                NODE_ENV: 'production',
                DB_PROVIDER: 'postgres',
                DATABASE_URL: 'postgresql://example:example@127.0.0.1/example?sslmode=require',
                RAILWAY_PROJECT_ID: 'test-project',
                RAILWAY_VOLUME_MOUNT_PATH: '',
                SQLITE_DB_PATH: ''
            }
        }
    );
    assert.equal(result.status, 0, result.stderr);
    const storage = JSON.parse(result.stdout.trim());
    assert.deepEqual(storage, {
        provider: 'postgres',
        persistent: true,
        mode: 'managed-postgres',
        location: 'DATABASE_URL'
    });
});
