import db from "../db_init.js";

export function createMatchDB(id: string, tournamentId: string | undefined): void {
	const stmt = db.prepare(`
		INSERT INTO matches (id, tournament_id)
		VALUES (?, ?)
	`);

	const result = stmt.run(id, tournamentId);
	if (result.changes === 0) throw new Error(`[DB] Failed to create match ${id}`); // If DB run fails, throws error
	else {
		if (tournamentId) console.log(`[DB] Created new match ${id} for tournament ${tournamentId}`);
		else console.log(`[DB] Created new match ${id} for single game`);
	}
}

export function addPlayerMatchDB(id: string, playerId: string, side: string): void {
	let stmt = null;
	if (side == "left") {
		stmt = db.prepare(`
			UPDATE matches
			SET player_left = ?
			WHERE id = ?
		`);
	} else {
		stmt = db.prepare(`
			UPDATE matches
			SET player_right = ?
			WHERE id = ?
		`);
	}
	const result = stmt.run(playerId, id);
	if (result.changes === 0)
		throw new Error(`[DB] Failed to add ${side} player to match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Added ${side} player for match ${id}`);
}

export function startMatchDB(id: string, tournamentId?: string): void {
	const stmt = db.prepare(`
		UPDATE matches
		SET started_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);

	const result = stmt.run(id);
	if (result.changes === 0) throw new Error(`[DB] Failed to start match ${id}`); // If DB run fails, throws error
	else {
		if (tournamentId) console.log(`[DB] Started new match ${id} for tournament ${tournamentId}`);
		else console.log(`[DB] Started new match ${id} for single game`);
	}
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

export function endMatchDB(id: string, winner: string | undefined): void {
	const stmt = db.prepare(`
		UPDATE matches
		SET winner = ?, ended_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);

	const result = stmt.run(winner, id);
	if (result.changes === 0) throw new Error(`[DB] Failed to end match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Match ${id} ended: winner is ${winner ?? "null"}`);
}

export function removeMatchDB(id: string): void {
	const stmt = db.prepare("DELETE FROM users WHERE id = ?");
	stmt.run(id);
}
