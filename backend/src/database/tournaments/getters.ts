import db from "../db_init.js";

// Retrieve all tournaments from the database
export function getAllTournamentsDB(): any[] {
	const stmt = db.prepare(`
		SELECT *
		FROM tournaments
		ORDER BY internal_id ASC
	`);

	const tournaments: any = stmt.all();
	if (tournaments.length === 0) throw new Error(`[DB] No tournaments found`);

	return tournaments;
}

// Retrive all the tournaments where a specific user played
export function getTournamentsByUserDB(username: string) {
	const stmt = db.prepare(`
        SELECT 
            t.id AS tournament_id,
            t.name,
            t.winner,
            t.created_at,
            t.notes,

            m.id AS match_id,
            m.player_left,
            m.player_right,
            m.score_left,
            m.score_right,
            m.round,
            m.winner AS match_winner,
            m.started_at AS match_started_at,
            m.in_tournament_placement_range,
            m.ended_at AS match_ended_at
        FROM tournaments t
        LEFT JOIN matches m 
            ON m.tournament_id = t.id 
            AND (m.player_left = @user OR m.player_right = @user)
        WHERE t.id IN (
            SELECT tournament_id 
            FROM tournament_players 
            WHERE username = @user
        )
        -- Order tournaments by newest date
        -- Order matches by ROUND DESCENDING (Highest round/Final first)
        ORDER BY t.created_at DESC, m.round DESC, m.id DESC;
    `);

	const rows: any = stmt.all({ user: username });

	const tournaments: any[] = [];

	for (const row of rows) {
		let tournament = tournaments.find((t) => t.id === row.tournament_id);

		if (!tournament) {
			tournament = {
				id: row.tournament_id,
				name: row.name,
				winner: row.winner,
				created_at: row.created_at,
				notes: row.notes,
				matches: [],
			};
			tournaments.push(tournament);
		}

		if (row.match_id) {
			tournament.matches.push({
				id: row.match_id,
				player_left: row.player_left,
				player_right: row.player_right,
				score_left: row.score_left,
				score_right: row.score_right,
				round: row.round,
				winner: row.match_winner,
				placement_range: row.in_tournament_placement_range,
				started_at: row.match_started_at,
				ended_at: row.match_ended_at,
			});
		}
	}

	return tournaments;
}

// Retrieve the desired tournament from the database (if present) and return it as json
export function getTournamentByIdDB(id: string): any {
	const stmt = db.prepare(`
		SELECT *
		FROM tournaments
		WHERE id = ?
	`);
	const result: any = stmt.get(id); // returns one row or undefined
	if (!result) throw new Error(`[DB] Tournament ${id} not found`);

	return result;
}
