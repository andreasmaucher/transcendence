import db from "../db_init.js";

// Retrieve all tournament players from the database
export function getAllTournamentPlayersDB(): any[] {
	const stmt = db.prepare(`
		SELECT *
		FROM tournament_players
		ORDER BY tournament_id ASC
	`);

	const tournament_players: any = stmt.all();
	if (tournament_players.length === 0) throw new Error(`[DB] No tournament players found`);

	return tournament_players;
}

// Retrieve all the players of a specific tournament (returns username and display_name)
export function getAllPlayersForTournamentDB(tournamentId: string) {
	const stmt = db.prepare(`
		SELECT username, display_name
		FROM tournament_players
		WHERE tournament_id = ?
		ORDER BY username ASC
	`);

	const players: any = stmt.all(tournamentId); // get ALL players, not just one

	if (players.length === 0) throw new Error(`[DB] No players found for tournament ${tournamentId}`);

	return players;
}

export function getAllTournamentsForUserDB(username: string) {
	const stmt = db.prepare(`
		SELECT tournaments.*
		FROM tournaments
		JOIN tournament_players
			ON tournaments.id = tournament_players.tournament_id
		WHERE tournament_players.username = ?
		ORDER BY tournaments.started_at DESC
	`);

	const tournaments: any = stmt.all(username);

	if (tournaments.length === 0) throw new Error(`[DB] User ${username} is not in any tournament`);

	return tournaments;
}

export function getTournamentWithPlayersDB(tournamentId: string) {
	const stmt = db.prepare(`
		SELECT
			tournaments.*,
			tournament_players.username,
			tournament_players.display_name
		FROM tournaments
		LEFT JOIN tournament_players
			ON tournaments.id = tournament_players.tournament_id
		WHERE tournaments.id = ?
	`);

	const rows: any = stmt.all(tournamentId);

	if (rows.length === 0) throw new Error(`[DB] Tournament ${tournamentId} not found`);

	// Convert rows into a structured object
	const tournament = {
		id: rows[0].id,
		name: rows[0].name,
		size: rows[0].size,
		winner: rows[0].winner,
		started_at: rows[0].started_at,
		ended_at: rows[0].ended_at,
		notes: rows[0].notes,
		players: rows.map((r: any) => ({
			username: r.username,
			displayName: r.display_name,
		})),
	};

	return tournament;
}

export function getAllTournamentsWithPlayersDB() {
	const stmt = db.prepare(`
		SELECT
			tournaments.*,
			tournament_players.username,
			tournament_players.display_name
		FROM tournaments
		LEFT JOIN tournament_players
			ON tournaments.id = tournament_players.tournament_id
		ORDER BY tournaments.started_at DESC
	`);

	const rows: any[] = stmt.all();

	if (rows.length === 0) return [];

	// Group rows by tournament ID
	const tournamentsMap: Record<string, any> = {};

	for (const r of rows) {
		if (!tournamentsMap[r.id]) {
			tournamentsMap[r.id] = {
				id: r.id,
				name: r.name,
				size: r.size,
				winner: r.winner,
				started_at: r.started_at,
				ended_at: r.ended_at,
				notes: r.notes,
				players: [],
			};
		}

		if (r.username) {
			tournamentsMap[r.id].players.push({
				username: r.username,
				displayName: r.display_name,
			});
		}
	}

	// Convert map to array
	return Object.values(tournamentsMap);
}
