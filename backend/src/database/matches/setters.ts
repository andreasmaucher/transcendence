import { Match } from "../../types/match.js";
import db from "../db_init.js";

// Create a new match row in the matches table of the database
export function createMatchDB(match: Match): void {
	const stmt = db.prepare(`
		INSERT INTO matches (id, mode, round, tournament_id, in_tournament_type, in_tournament_placement_range)
		VALUES (?, ?, ?, ?, ?, ?)
	`);

	let result = null;
	if (match.tournament) {
		const { id, round, type, placementRange } = match.tournament;
		result = stmt.run(match.id, match.mode, round, id, type, JSON.stringify(placementRange));
	} else result = stmt.run(match.id, match.mode, 0, null, null, null);

	if (result.changes === 0)
		throw new Error(`[DB] Failed to create match ${match.id}`); // If DB run fails, throws error
	else {
		if (match.tournament)
			console.log(
				`[DB] Created new match ${match.id} for round ${match.tournament.round} of tournament ${match.tournament.id}`
			);
		else console.log(`[DB] Created new match ${match.id} for single game`);
	}
}

// Add a player (left or right) to the match
export function addPlayerMatchDB(id: string, playerId: string, side: string): void {
	let stmt = null;
	if (side === "left") {
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

// Start the match
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

// Update the match score
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

// End the match and set the winner
export function endMatchDB(match: Match): void {
	const { id } = match;
	const { winner } = match.state;
	const stmt = db.prepare(`
		UPDATE matches
		SET winner = ?, notes = ?, ended_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);

	const notes = match.mode === "local" && winner === "right" ? "The winner is the guest" : null;

	const result = stmt.run(winner, notes, id);
	if (result.changes === 0) throw new Error(`[DB] Failed to end match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Match ${id} ended: winner is ${winner}`);
}

export function forfeitMatchDB(id: string, playerId: string) {
	const stmt = db.prepare(`
		UPDATE matches
		SET notes = ?, ended_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);

	const result = stmt.run(`Match forfeited: player ${playerId} left`, id);
	if (result.changes === 0) throw new Error(`[DB] Failed to forfeit match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Match ${id} forfeited: player ${playerId} left`);
}

// Remove a match from the database
export function removeMatchDB(id: string): void {
	const stmt = db.prepare("DELETE FROM matches WHERE id = ?");
	const result = stmt.run(id);
	if (result.changes === 0) throw new Error(`[DB] Failed to remove match ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Match ${id} removed`);
}
