const fs = require('fs');
const path = require('path');

function isInside(parent, child) {
    const relative = path.relative(parent, child);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveSqliteStorage() {
    const production = process.env.NODE_ENV === 'production';
    const onRailway = Boolean(process.env.RAILWAY_PROJECT_ID);
    const configuredPath = String(process.env.SQLITE_DB_PATH || '').trim();
    const volumePath = String(process.env.RAILWAY_VOLUME_MOUNT_PATH || '').trim();

    if (onRailway && production) {
        if (!volumePath) {
            throw new Error(
                'Persistent SQLite protection: no Railway volume is attached. ' +
                'Mount a volume at /app/data and set SQLITE_DB_PATH=/app/data/local.db, ' +
                'or configure DB_PROVIDER=postgres with DATABASE_URL.'
            );
        }

        const resolvedVolume = path.resolve(volumePath);
        const databasePath = configuredPath
            ? path.resolve(configuredPath)
            : path.join(resolvedVolume, 'local.db');

        if (!isInside(resolvedVolume, databasePath)) {
            throw new Error(
                `Persistent SQLite protection: database path ${databasePath} is outside Railway volume ${resolvedVolume}.`
            );
        }
        if (!fs.existsSync(resolvedVolume)) {
            throw new Error(`Persistent SQLite protection: Railway volume mount ${resolvedVolume} is unavailable.`);
        }

        return {
            databasePath,
            persistent: true,
            storageMode: 'railway-volume',
            volumePath: resolvedVolume
        };
    }

    if (production && !configuredPath) {
        throw new Error(
            'Persistent SQLite protection: SQLITE_DB_PATH must be an absolute persistent path in production.'
        );
    }
    if (production && !path.isAbsolute(configuredPath)) {
        throw new Error('Persistent SQLite protection: production SQLITE_DB_PATH must be absolute.');
    }

    return {
        databasePath: path.resolve(process.cwd(), configuredPath || 'local.db'),
        persistent: production && path.isAbsolute(configuredPath),
        storageMode: production ? 'configured-absolute-path' : 'local-development',
        volumePath: null
    };
}

module.exports = resolveSqliteStorage();
