import { TournamentDB } from "../../types/db.js";
import db from "../db_init.js";

// Retrieve all tournaments from the database
export function getAllTournamentsDB(): any[] {
	const stmt = db.prepare(`
		SELECT *
		FROM tournaments
		ORDER BY internal_id ASC
	`);

	const tournaments = stmt.all();
	if (tournaments.length === 0) throw new Error(`[DB] No tournaments found`);

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
