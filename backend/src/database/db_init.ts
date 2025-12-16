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
		blocked TEXT DEFAULT '[]',
		stats TEXT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS tournament_players (
		tournament_id TEXT NOT NULL,
		username TEXT NOT NULL,
		display_name TEXT NOT NULL,

		PRIMARY KEY (tournament_id, username),

		FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
		FOREIGN KEY (username) REFERENCES users(username)
	);

	CREATE TABLE IF NOT EXISTS tournaments (
		internal_id INTEGER PRIMARY KEY AUTOINCREMENT,
		id TEXT UNIQUE NOT NULL,
		name TEXT NOT NULL,
		size INTEGER,
		winner TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		started_at DATETIME,
		ended_at DATETIME,
		notes TEXT,
		creator TEXT,

		FOREIGN KEY (winner) REFERENCES users (username)
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
		started_at DATETIME,
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

function hasColumn(table: string, column: string): boolean {
	try {
		const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
		return rows.some((r) => r.name === column);
	} catch {
		return false;
	}
}

function ensureTournamentsCreatedAtColumn() {
	if (hasColumn("tournaments", "created_at")) return;
	try {
		db.exec("ALTER TABLE tournaments ADD COLUMN created_at DATETIME");
		db.exec("UPDATE tournaments SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
		console.log("[DB] Migrated tournaments table: added created_at");
	} catch (error) {
		console.error("[DB] Failed to migrate tournaments.created_at:", error);
	}
}

function ensureMatchesTxHashColumn() {
	if (hasColumn("matches", "tx_hash")) return;
	try {
		db.exec("ALTER TABLE matches ADD COLUMN tx_hash TEXT");
		console.log("[DB] Migrated matches table: added tx_hash");
	} catch (error) {
		console.error("[DB] Failed to migrate matches.tx_hash:", error);
	}
}

// Best-effort migrations for older db files.
ensureTournamentsCreatedAtColumn();
ensureMatchesTxHashColumn();

function cleanupIncompleteGames() {
	try {
		const deletedMatches = db.prepare(`DELETE FROM matches WHERE winner IS NULL AND notes IS NULL`).run();

		const deletedTournaments = db.prepare(`DELETE FROM tournaments WHERE winner IS NULL AND notes IS NULL`).run();

		console.log(
			`[DB] Cleanup complete — removed ${deletedMatches.changes} unfinished matches and ${deletedTournaments.changes} unfinished tournaments.`
		);
	} catch (error: any) {
		console.error("[DB] Cleanup failed:", error.message);
	}
}

function cleanupAbandonedTournaments() {
	try {
		if (!hasColumn("tournaments", "created_at") || !hasColumn("tournaments", "started_at")) {
			return;
		}

		// Regularly cleanup tournaments from the db so the lobby does not get polluted.
		// NOTE: Implemented here to avoid a circular dependency between db init and tournament setters.
		const minutesOld = 3;
		const stmt = db.prepare(`
			DELETE FROM tournaments 
			WHERE started_at IS NULL 
			AND datetime(created_at, '+' || ? || ' minutes') < datetime('now')
		`);
		const result = stmt.run(minutesOld);
		if (result.changes > 0) {
			console.log(`[DB] Cleaned up ${result.changes} abandoned tournament(s) older than ${minutesOld} minutes`);
		}
	} catch (error) {
		console.error("[DB] Error cleaning up abandoned tournaments:", error);
	}
}

// Run cleanup on startup
cleanupIncompleteGames();
cleanupAbandonedTournaments();

export default db;
