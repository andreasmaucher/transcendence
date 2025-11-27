import db from "../db_init.js";

// Retrieve all matches from the database
export function getAllMatchesDB(): any[] {
	const stmt = db.prepare(`
    SELECT *
    FROM matches
    ORDER BY internal_id ASC
  `);

	const matches = stmt.all();
	if (matches.length === 0) throw new Error(`[DB] No matches found`);

	return matches;
}

// Retrieve the desired match from the database (if present) and return it as json
export function getMatchByIdDB(id: string) {
	const stmt = db.prepare(`
		SELECT *
		FROM matches
		WHERE id = ?
	`);
	const result = stmt.get(id); // returns one row or undefined
	if (!result) throw new Error(`[DB] Match ${id} not found`);

	return result;
}
