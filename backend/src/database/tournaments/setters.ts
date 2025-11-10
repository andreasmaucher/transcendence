import { PaddleSide } from "../../types/match.js";
import db from "../db_init.js";

export function createTournamentDB(id: string, size: number): void {
	const stmt = db.prepare(`
		INSERT INTO tournaments (id, size)
		VALUES (?, ?)
	`);
	const result = stmt.run(id, size);
	if (result.changes === 0) throw new Error(`[DB] Failed to create tournament ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Created new tournament ${id} with size ${size}`);
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

export function removeTournamentDB(id: string): void {
	const stmt = db.prepare("DELETE FROM users WHERE id = ?");
	stmt.run(id);
}
