import db from "../db_init.js";

export function getMatchById(roomId: string) {
	const stmt = db.prepare(`
		SELECT *
		FROM matches
		WHERE room_id = ?
	`);
	return stmt.get(roomId); // returns one row or undefined
}

/* export function getMatchById(id: number) {
	const stmt = db.prepare(`
		SELECT *
		FROM matches
		WHERE id = ?
	`);
	return stmt.get(id);
} */
