import db from "../db_init.js";

export function startMatch(id: string, tournament_id: string, playerLeftId?: number, playerRightId?: number): void {
	const stmt = db.prepare(`
		INSERT INTO matches (id, tournament_id, player_left, player_right, started_at)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
	`);
	stmt.run(id, tournament_id, playerLeftId ?? null, playerRightId ?? null);
	console.log(`[db] Created new match record for tournament ${tournament_id}`);
}

export function updateMatch(id: string, left: number, right: number): void {
	const stmt = db.prepare(`
		UPDATE matches
		SET score_left = ?, score_right = ?
		WHERE id = ?
	`);
	stmt.run(left, right, id);
	console.log(`[db] Match updated for tournament ${id}: ${left}-${right}`);
}

export function endMatch(id: string, winner: string | null): void {
	const stmt = db.prepare(`
		UPDATE matches
		SET winner = ?, ended_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);
	stmt.run(winner, id);
	console.log(`[db] Match ended for tournament ${id}: winner is ${winner ?? "null"}`);
}
