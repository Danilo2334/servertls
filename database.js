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
            twofa_secret TEXT
        )
    `);

    return db;
}

module.exports = { setupDB };