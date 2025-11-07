// backend/srcs/db.ts
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = process.env.DB_PATH || "/app/data/database.sqlite";

// Ensure directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// If the DB file doesn't exist yet, create an empty one
if (!fs.existsSync(dbPath)) {
	fs.closeSync(fs.openSync(dbPath, "w"));
	console.log("[backend] Created new SQLite database file:", dbPath);
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

console.log("[backend] Using database at:", dbPath);

db.exec(`
	CREATE TABLE IF NOT EXISTS users (
		internal_id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password TEXT NOT NULL,
		provider TEXT DEFAULT 'local',
		provider_id TEXT DEFAULT NULL,
		avatar TEXT,
		friends TEXT NULL,
		stats TEXT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS tournaments (
		internal_id INTEGER PRIMARY KEY AUTOINCREMENT,
		id TEXT UNIQUE NOT NULL,
		size INTEGER,
		winner TEXT,
		started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		ended_at DATETIME
	);

	CREATE TABLE IF NOT EXISTS matches (
		internal_id INTEGER PRIMARY KEY AUTOINCREMENT,
		id TEXT UNIQUE NOT NULL,
		tournament_id TEXT,
		player_left TEXT,
		player_right TEXT,
		score_left INTEGER DEFAULT 0,
		score_right INTEGER DEFAULT 0,
		winner TEXT,
		started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		ended_at DATETIME,
		FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
		FOREIGN KEY (player_left) REFERENCES users (username),
		FOREIGN KEY (player_right) REFERENCES users (username)
	);
`);

export default db;
