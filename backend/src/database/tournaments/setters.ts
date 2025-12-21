import { PaddleSide } from "../../types/match.js";
import db from "../db_init.js";

export function createTournamentDB(id: string, name: string, size: number, creator?: string): void {
	const stmt = db.prepare(`
		INSERT INTO tournaments (id, name, size, creator)
		VALUES (?, ?, ?, ?)
	`);
	const result = stmt.run(id, name, size, creator || null);
	if (result.changes === 0) throw new Error(`[DB] Failed to create tournament ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Created new tournament ${id} named ${name} with size ${size}`);
}

export function startTournamentDB(id: string): void {
	const stmt = db.prepare(`
		UPDATE tournaments
		SET started_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);

	const result = stmt.run(id);
	if (result.changes === 0) throw new Error(`[DB] Failed to start tournament ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Started new tournament ${id}`);
}

export function updateTournamentDB(id: string, left: number, right: number): void {
	const stmt = db.prepare(`
		UPDATE tournaments
		SET score_left = ?, score_right = ?
		WHERE id = ?
	`);
	const result = stmt.run(left, right, id);
	if (result.changes === 0) throw new Error(`[DB] Failed to update tournament ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Updated tournament ${id}: ${left}-${right}`);
}

export function endTournamentDB(id: string, winner?: string): void {
	const stmt = db.prepare(`
		UPDATE tournaments
		SET winner = ?, ended_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);
	const result = stmt.run(winner, id);
	if (result.changes === 0) throw new Error(`[DB] Failed to end tournament ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Tournament ${id} ended: ${winner ?? "null"}`);
}

export function forfeitTournamentDB(id: string, playerId: string) {
	const stmt = db.prepare(`
		UPDATE tournaments
		SET notes = ?, ended_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);

	const result = stmt.run(`Tournament forfeited: player ${playerId} left`, id);
	if (result.changes === 0) throw new Error(`[DB] Failed to forfeit match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Tournament ${id} forfeited: player ${playerId} left`);
}

export function removeTournamentDB(id: string): void {
	const stmt = db.prepare("DELETE FROM tournaments WHERE id = ?");
	stmt.run(id);
}

//  added this function to clean up abandoned tournaments
/*
tournaments are deleted if ALL of these conditions are true:
- start_at is NULL, meaning they never reached 4 players
- created_at is more than 3 minutes ago
 */
export function cleanupAbandonedTournamentsDB(minutesOld: number = 3): number {
	const stmt = db.prepare(`
		DELETE FROM tournaments 
		WHERE started_at IS NULL 
		AND datetime(created_at, '+' || ? || ' minutes') < datetime('now')
	`);
	const result = stmt.run(minutesOld);
	const deletedCount = result.changes;
	
	if (deletedCount > 0) {
		console.log(`[DB] Cleaned up ${deletedCount} abandoned tournament(s) older than ${minutesOld} minutes`);
	}
	return deletedCount;
}
