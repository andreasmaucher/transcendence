import db from "../db_init.js";

// Retrieve all messages from the database
export function getAllMessagesDB(): any[] {
	const stmt = db.prepare(`
        SELECT *
        FROM messages
        ORDER BY sent_at ASC
    `);

	const messages = stmt.all();
	//if (messages.length === 0) throw new Error(`[DB] No messages found`);

	return messages;
}

// Retrieve all global messages (with receiver null)
export function getAllGlobalMessagesDB(): any[] {
	const stmt = db.prepare(`
        SELECT *
        FROM messages
        WHERE type = ?
        ORDER BY sent_at ASC
    `);

	const messages = stmt.all("broadcast"); // returns empty array if no messages found
	//if (messages.length === 0) throw new Error(`[DB] No global messages found`);

	return messages;
}

// Retrieve the messages where the user is either the sender (and the receiver is not null) or the receiver
export function getPrivateUserMessagesDB(username: string): any[] {
	const stmt = db.prepare(`
        SELECT *
        FROM messages
        WHERE (sender = ? OR receiver = ?) 
          AND receiver IS NOT NULL
        ORDER BY sent_at ASC
    `);

	const messages = stmt.all(username, username); // returns empty array if no messages found
	//if (messages.length === 0) throw new Error(`[DB] No privatemessages found`);

	return messages;
}

// Retrieve the messages where the user is the sender
export function getUserAsSenderMessagesDB(username: string): any[] {
	const stmt = db.prepare(`
        SELECT *
        FROM messages
        WHERE sender = ?
        ORDER BY sent_at ASC
    `);

	const messages = stmt.all(username); // returns empty array if no messages found
	//if (messages.length === 0) throw new Error(`[DB] No messages found`);

	return messages;
}

// Retrieve the messages where the user is the receiver
export function getUserAsReceiverMessagesDB(username: string): any[] {
	const stmt = db.prepare(`
        SELECT *
        FROM messages
        WHERE receiver = ?
        ORDER BY sent_at ASC
    `);

	const messages = stmt.all(username); // returns empty array if no messages found
	//if (messages.length === 0) throw new Error(`[DB] No messages found`);

	return messages;
}

// Check if the user is part of a tournament group chat and return the id of that tournament if yes
export function checkIfTournamentMessagesDB(username: string): string | undefined {
	const stmt = db.prepare(`
        SELECT *
        FROM messages
        WHERE type = ? AND (sender = ? OR receiver = ?)
        ORDER BY sent_at ASC
    `);

	const messages: any = stmt.all("tournament", username, username); // returns empty array if no messages found
	if (messages.length === 0) return undefined;
	else {
		let gameId = undefined;
		for (const message of messages) {
			if (gameId && message.game_id != gameId)
				throw new Error(`[DB] Messages for multiple tournaments for ${username}`);
			gameId = message.game_id;
		}
		return gameId;
	}
}

export function getTournamentMessagesDB(tournamentId: string): any[] {
	const stmt = db.prepare(`
        SELECT *
        FROM messages
        WHERE type = ? AND game_id = ?
        ORDER BY sent_at ASC
    `);

	const messages = stmt.all("tournament", tournamentId); // returns empty array if no messages found
	//if (messages.length === 0) throw new Error(`[DB] No tournament messages found`);

	return messages;
}
