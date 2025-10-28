// backend/srcs/db.ts
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = process.env.DB_PATH || "/app/data/database.sqlite";

// Ensure directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

console.log("[backend] Using database at:", dbPath);

db.exec(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS matches (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		room_id TEXT NOT NULL,
		player_left INTEGER,
		player_right INTEGER,
		score_left INTEGER DEFAULT 0,
		score_right INTEGER DEFAULT 0,
		winner INTEGER,
		started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		ended_at DATETIME,
		FOREIGN KEY (player_left) REFERENCES users(id),
		FOREIGN KEY (player_right) REFERENCES users(id),
		FOREIGN KEY (winner) REFERENCES users(id)
	);
`);

export default db;
