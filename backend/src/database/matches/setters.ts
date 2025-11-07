import db from "../db_init.js";

export function startMatchDB(id: string, tournament_id: string, playerLeftId?: number, playerRightId?: number): void {
	const stmt = db.prepare(`
		INSERT INTO matches (id, tournament_id, player_left, player_right, started_at)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
	`);

	const result = stmt.run(id, tournament_id, playerLeftId ?? null, playerRightId ?? null);
	if (result.changes === 0) throw new Error(`[DB] Failed to create match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Created new match ${id} for tournament ${tournament_id}`);
}

export function updateMatchDB(id: string, left: number, right: number): void {
	const stmt = db.prepare(`
		UPDATE matches
		SET score_left = ?, score_right = ?
		WHERE id = ?
	`);

	const result = stmt.run(left, right, id);
	if (result.changes === 0) throw new Error(`[DB] Failed to update match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Match ${id} updated: ${left}-${right}`);
}

export function endMatchDB(id: string, winner: string | null): void {
	const stmt = db.prepare(`
		UPDATE matches
		SET winner = ?, ended_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);

	const result = stmt.run(winner, id);
	if (result.changes === 0) throw new Error(`[DB] Failed to end match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Match ${id} ended: winner is ${winner ?? "null"}`);
}
