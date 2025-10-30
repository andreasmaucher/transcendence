import db from "../db_init.js";

export function getTournamentById(id: string) {
	const stmt = db.prepare(`
		SELECT *
		FROM tournaments
		WHERE id = ?
	`);
	const result = stmt.get(id); // returns one row or undefined
	if (!result) throw new Error(`[DB] Tournament ${id} not found`);

	return result;
}
