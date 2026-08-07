const { AsyncLocalStorage } = require('async_hooks');

const requestedProvider = String(process.env.DB_PROVIDER || '').trim().toLowerCase();

if (requestedProvider && !['sqlite', 'postgres'].includes(requestedProvider)) {
    throw new Error(`Unsupported DB_PROVIDER "${requestedProvider}". Use "sqlite" or "postgres".`);
}

// Local development is deliberately SQLite-first, even if DATABASE_URL happens
// to be inherited from another terminal or Railway CLI session. Production keeps
// backwards compatibility by selecting Postgres when DATABASE_URL is present.
const USE_POSTGRES = requestedProvider
    ? requestedProvider === 'postgres'
    : process.env.NODE_ENV === 'production' && Boolean(process.env.DATABASE_URL);

if (USE_POSTGRES && !process.env.DATABASE_URL) {
    throw new Error('DB_PROVIDER=postgres requires DATABASE_URL.');
}

const postgres = USE_POSTGRES ? require('./postgres') : null;
const sqlite = USE_POSTGRES ? null : require('./sqlite');
const sqliteStorage = USE_POSTGRES ? null : require('./sqlite-path');
const transactionStorage = new AsyncLocalStorage();
const PROVIDER = USE_POSTGRES ? 'postgres' : 'sqlite';
const DATABASE_LOCATION = USE_POSTGRES
    ? 'DATABASE_URL'
    : sqliteStorage.databasePath;
const IS_PERSISTENT = USE_POSTGRES || sqliteStorage.persistent;
const STORAGE_MODE = USE_POSTGRES ? 'managed-postgres' : sqliteStorage.storageMode;

function toPostgresSql(sql) {
    let index = 0;

    return sql.replace(/\?/g, () => {
        index += 1;
        return `$${index}`;
    });
}

async function query(sql, params = []) {

    if (USE_POSTGRES) {
        const client = transactionStorage.getStore();

        const result = client
            ? await client.query(toPostgresSql(sql), params)
            : await postgres.query(toPostgresSql(sql), params);

        return result.rows;
    }

    const stmt = sqlite.prepare(sql);

    const lowered = sql.trim().toLowerCase();

    if (lowered.startsWith('select')) {
        return stmt.all(params);
    }

    return stmt.run(params);
}

async function withTransaction(callback) {
    const activeClient = transactionStorage.getStore();

    if (USE_POSTGRES) {
        if (activeClient) {
            return callback();
        }

        const client = await postgres.connect();

        try {
            await client.query('BEGIN');

            return await transactionStorage.run(client, async () => {
                const result = await callback();
                await client.query('COMMIT');
                return result;
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    if (activeClient) {
        return callback();
    }

    sqlite.exec('BEGIN IMMEDIATE');

    return await transactionStorage.run({ sqlite: true }, async () => {
        try {
            const result = await callback();
            sqlite.exec('COMMIT');
            return result;
        } catch (error) {
            sqlite.exec('ROLLBACK');
            throw error;
        }
    });
}

async function close() {
    if (USE_POSTGRES) {
        await postgres.end();
        return;
    }

    sqlite.close();
}

module.exports = {
    query,
    withTransaction,
    close,
    USE_POSTGRES,
    PROVIDER,
    DATABASE_LOCATION,
    IS_PERSISTENT,
    STORAGE_MODE
};
