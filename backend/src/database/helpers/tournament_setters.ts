import db from "../db_init.js";

export function startTournamentDB(id: string, size: number): void {
	const stmt = db.prepare(`
		INSERT INTO tournaments (id, size, started_at)
		VALUES (?, ?, CURRENT_TIMESTAMP)
	`);
	const result = stmt.run(id, size);
	if (result.changes === 0)                                                                      // If DB run fails, throws error
		throw new Error(`[DB] Failed to create tournament ${id}`);
	else
		console.log(`[DB] Created new tournament ${id} with size ${size}`);
}

export function updateTournamentDB(id: string, left: number, right: number): void {
	const stmt = db.prepare(`
		UPDATE tournaments
		SET score_left = ?, score_right = ?
		WHERE id = ?
	`);
	const result = stmt.run(left, right, id);
	if (result.changes === 0)                                                                      // If DB run fails, throws error
		throw new Error(`[DB] Failed to update tournament ${id}`);
	else
		console.log(`[DB] Updated tournament ${id}: ${left}-${right}`);
}

export function endTournamentDB(id: string, winner: string | null): void {
	const stmt = db.prepare(`
		UPDATE tournaments
		SET winner = ?, ended_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);
	const result = stmt.run(winner, id);
	if (result.changes === 0)                                                                      // If DB run fails, throws error
		throw new Error(`[DB] Failed to end tournament ${id}`);
	else
		console.log(`[DB] Tournament ${id} ended: ${winner ?? "null"}`);
}
