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
		friends TEXT DEFAULT '[]',
		stats TEXT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS tournaments (
		internal_id INTEGER PRIMARY KEY AUTOINCREMENT,
		id TEXT UNIQUE NOT NULL,
		name TEXT UNIQUE NOT NULL,
		size INTEGER,
		winner TEXT,
		started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		ended_at DATETIME,
		notes TEXT
	);

	CREATE TABLE IF NOT EXISTS matches (
		internal_id INTEGER PRIMARY KEY AUTOINCREMENT,
		id TEXT UNIQUE NOT NULL,
		mode TEXT,
		player_left TEXT,
		player_right TEXT,
		tournament_id TEXT,
		round INTEGER,
		in_tournament_type TEXT,
		in_tournament_placement_range TEXT,
		score_left INTEGER DEFAULT 0,
		score_right INTEGER DEFAULT 0,
		winner TEXT,
		started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		ended_at DATETIME,
		notes TEXT,

		FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
		FOREIGN KEY (player_left) REFERENCES users (username),
		FOREIGN KEY (player_right) REFERENCES users (username)
	);

	CREATE TABLE IF NOT EXISTS messages (
    	internal_id INTEGER PRIMARY KEY AUTOINCREMENT,
		id TEXT UNIQUE NOT NULL,
    	sender TEXT NOT NULL,
    	receiver TEXT,
    	type TEXT NOT NULL,
   		content TEXT,
		game_id TEXT,
    	sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    	FOREIGN KEY (sender) REFERENCES users(username),
    	FOREIGN KEY (receiver) REFERENCES users(username)
	);
`);

function cleanupIncompleteGames() {
	try {
		const deletedMatches = db.prepare(`DELETE FROM matches WHERE winner IS NULL`).run();

		const deletedTournaments = db.prepare(`DELETE FROM tournaments WHERE winner IS NULL`).run();

		console.log(
			`[DB] Cleanup complete — removed ${deletedMatches.changes} unfinished matches and ${deletedTournaments.changes} unfinished tournaments.`
		);
	} catch (error: any) {
		console.error("[DB] Cleanup failed:", error.message);
	}
}

// Run cleanup on startup
cleanupIncompleteGames();

export default db;
