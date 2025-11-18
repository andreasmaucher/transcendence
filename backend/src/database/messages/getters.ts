import db from "../db_init.js";

// Retrieve all messages from the database
export function getAllMessages(): any[] {
	const stmt = db.prepare(`
        SELECT internal_id, sender, receiver, type, content, created_at
        FROM messages
        ORDER BY created_at DESC
    `);

	return stmt.all();
}

// Retrieve all global messages (with receiver null)
export function getAllGlobalMessagesDB(): any[] {
	const stmt = db.prepare(`
        SELECT *
        FROM messages
        WHERE receiver IS NULL
        ORDER BY created_at DESC
    `);

	return stmt.all(); // returns empty array if no messages found
}

// Retrieve the messages where the user is either the sender (and the receiver is not null) or the receiver
export function getPrivateUserMessagesDB(username: string): any[] {
	const stmt = db.prepare(`
        SELECT *
        FROM messages
        WHERE (sender = ? OR receiver = ?) 
          AND receiver IS NOT NULL
        ORDER BY created_at DESC
    `);

	return stmt.all(username, username); // returns empty array if no messages found
}

// Retrieve the messages where the user is the sender
export function getUserAsSenderMessagesDB(username: string): any[] {
	const stmt = db.prepare(`
        SELECT *
        FROM messages
        WHERE sender = ?
        ORDER BY created_at DESC
    `);

	return stmt.all(username); // returns empty array if no messages found
}

// Retrieve the messages where the user is the receiver
export function getUserAsReceiverMessagesDB(username: string): any[] {
	const stmt = db.prepare(`
        SELECT *
        FROM messages
        WHERE receiver = ?
        ORDER BY created_at DESC
    `);

	return stmt.all(username); // returns empty array if no messages found
}
