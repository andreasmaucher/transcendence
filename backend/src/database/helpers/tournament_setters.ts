import db from "../db_init.js";

export function startTournamentDB(id: string, size: number): void {
	const stmt = db.prepare(`
		INSERT INTO tournaments (id, size, started_at)
		VALUES (?, ?, CURRENT_TIMESTAMP)
	`);
	stmt.run(id, size);
	console.log(`[db] Created new tournament ${id}`);
}

export function updateTournamentDB(id: string, left: number, right: number): void {
	const stmt = db.prepare(`
		UPDATE tournaments
		SET score_left = ?, score_right = ?
		WHERE id = ?
	`);
	stmt.run(left, right, id);
	console.log(`[db] Tournament ${id} updated: ${left}-${right}`);
}

export function endTournamentDB(id: string, winner: string | null): void {
	const stmt = db.prepare(`
		UPDATE tournaments
		SET winner = ?, ended_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);
	stmt.run(winner, id);
	console.log(`[db] Tournament ${id}ended: winner is ${winner ?? "null"}`);
}
