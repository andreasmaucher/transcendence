import db from "../db_init.js";

// Create a new tournament player row
export function createTournamentPlayerDB(tournamentId: string, username: string, displayName: string): void {
	const stmt = db.prepare(`
		INSERT INTO tournament_players (tournament_id, username, display_name)
		VALUES (?, ?, ?)
	`);

	const result = stmt.run(tournamentId, username, displayName);

	if (result.changes === 0) throw new Error(`[DB] Failed to create tournament player for tournament ${tournamentId}`);
	// If DB run fails, throws error
	else console.log(`[DB] Created new tournament player for tournament ${tournamentId}`);
}

// ANDY: added this to solve a bug where if the creator of a tournament leaves and then joins his own tournament again the lobby counter would not work
// Problem: Primary Key (tournament_id, username) when a player left they were removed from match.players and tournament.players but not from the tournament_players db table
// when they tried to rejoin it returned a unique constraint error
export function removeTournamentPlayerDB(tournamentId: string, username: string): void {
	const stmt = db.prepare(`
		DELETE FROM tournament_players
		WHERE tournament_id = ? AND username = ?
	`);
	const result = stmt.run(tournamentId, username);
	console.log(`[DB] Removed player ${username} from tournament ${tournamentId}`);
}
