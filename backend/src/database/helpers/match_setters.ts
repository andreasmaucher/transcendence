import db from "../db_init.js";

export function startMatch(roomId: string, playerLeftId?: number, playerRightId?: number): void {
	const stmt = db.prepare(`
		INSERT INTO matches (room_id, player_left, player_right, started_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)
	`);
	stmt.run(roomId, playerLeftId ?? null, playerRightId ?? null);
	console.log(`[db] Created new match record for room ${roomId}`);
}

export function updateMatch(roomId: string, left: number, right: number): void {
	const stmt = db.prepare(`
		UPDATE matches
		SET score_left = ?, score_right = ?
		WHERE room_id = ?
	`);
	stmt.run(left, right, roomId);
	console.log(`[db] Match updated for room ${roomId}: ${left}-${right}`);
}

export function endMatch(roomId: string, winnerId: string | null): void {
	const stmt = db.prepare(`
		UPDATE matches
		SET winner = ?, ended_at = CURRENT_TIMESTAMP
		WHERE room_id = ?
	`);
	stmt.run(winnerId, roomId);
	console.log(`[db] Match ended for room ${roomId}: winner is ${winnerId ?? "null"}`);
}
