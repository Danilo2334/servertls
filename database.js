const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function setupDB() {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            twofa_secret TEXT,
            role TEXT DEFAULT 'analyst'
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS threats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            severity TEXT,
            message TEXT,
            ip TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    return db;
}

module.exports = { setupDB };