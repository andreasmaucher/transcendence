import db from "../db_init.js";

export function getMatchById(id: string) {
	const stmt = db.prepare(`
		SELECT *
		FROM matches
		WHERE id = ?
	`);
	const result = stmt.get(id); // returns one row or undefined
	if (!result) throw new Error(`[DB] Match ${id} not found`);

	return result;
}
