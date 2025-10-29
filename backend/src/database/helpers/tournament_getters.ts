import db from "../db_init.js";

export function getTournamentById(id: string) {
	const stmt = db.prepare(`
		SELECT *
		FROM tournaments
		WHERE id = ?
	`);
	return stmt.get(id); // returns one row or undefined
}
