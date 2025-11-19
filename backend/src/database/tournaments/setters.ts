import { PaddleSide } from "../../types/match.js";
import db from "../db_init.js";

export function createTournamentDB(id: string, name: string, size: number): void {
	const stmt = db.prepare(`
		INSERT INTO tournaments (id, name, size)
		VALUES (?, ?, ?)
	`);
	const result = stmt.run(id, name, size);
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

export function endTournamentDB(id: string, winner?: PaddleSide): void {
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
	const stmt = db.prepare("DELETE FROM users WHERE id = ?");
	stmt.run(id);
}
