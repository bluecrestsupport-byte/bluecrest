const Database = require('better-sqlite3');
const sqliteStorage = require('./sqlite-path');

const db = new Database(sqliteStorage.databasePath);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = FULL');
db.pragma('busy_timeout = 5000');

module.exports = db;
