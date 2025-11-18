import { Message } from "../../types/chat.js";
import db from "../db_init.js";

// Create a new message row in the messages table of the database
export function addMessageDB(message: Message): void {
	const stmt = db.prepare(`
		INSERT INTO messages (sender, receiver, type, content, created_at)
		VALUES (?, ?, ?, ?)
	`);

	const result = stmt.run(message.sender, message.receiver, message.type, message.content);

	if (result.changes === 0) throw new Error(`[DB] Failed to add message of type ${message.type} to database`);
	// If DB run fails, throws error
	else console.log(`[DB] Added message of type ${message.type} to database`);
}

// Remove a message from the database
export function removeMessageDB(id: number): void {
	const stmt = db.prepare("DELETE FROM messages WHERE id = ?");
	const result = stmt.run(id);
	if (result.changes === 0) throw new Error(`[DB] Failed to remove message ${id}`); // If DB run fails, throws error
	else console.log(`[DB] Message ${id} removed`);
}
