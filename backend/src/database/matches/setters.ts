import { Match } from "../../types/game.js";
import db from "../db_init.js";

export function createMatchDB(match: Match): void {
	const stmt = db.prepare(`
		INSERT INTO matches (id, type, round, tournament_id, in_tournament_type, in_tournament_placement_range)
		VALUES (?, ?, ?, ?, ?, ?)
	`);

	let result = undefined;
	if (match.tournament) {
		const { id, round, type, placementRange } = match.tournament;
		const placementRangeStr = placementRange.join(",");
		result = stmt.run(match.id, match.type, round, id, type, placementRangeStr);
	} else result = stmt.run(match.id, match.type, 0);

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
