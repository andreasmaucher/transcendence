import db from "../db_init.js";

export function getMatchById(id: string) {
	const stmt = db.prepare(`
		SELECT *
		FROM matches
		WHERE id = ?
	`);
	return stmt.get(id); // returns one row or undefined
}
