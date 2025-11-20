import { Message } from "../../types/chat.js";
import db from "../db_init.js";

// Create a new message row in the messages table of the database
export function addMessageDB(msg: Message): void {
	const stmt = db.prepare(`
        INSERT INTO messages (id, sender, receiver, type, game_id, content, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

	const result = stmt.run(msg.id, msg.sender, msg.receiver, msg.type, msg.gameId, msg.content, msg.sentAt);

	if (result.changes === 0) throw new Error(`[DB] Failed to add message of type ${msg.type} to database`);
	else console.log(`[DB] Added message of type ${msg.type} to database`);
}

export function removeTournamentMessages(tournamentId: string): void {
	const stmt = db.prepare("DELETE FROM messages WHERE type = 'tournament' AND game_id = ?");
	const result = stmt.run(tournamentId);
	if (result.changes === 0)
		throw new Error(`[DB] Failed to remove tournament ${tournamentId} messages`); // If DB run fails, throws error
	else console.log(`[DB] Tournament ${tournamentId} messages removed removed`);
}

// Remove a message from the database
export function removeMessageDB(id: number): void {
	const stmt = db.prepare("DELETE FROM messages WHERE id = ?");
	const result = stmt.run(id);
	if (result.changes === 0) throw new Error(`[DB] Failed to remove message ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Message ${id} removed`);
}
