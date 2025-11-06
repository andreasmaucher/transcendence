import db from "../db_init.js";

export function registerUserDB(username: string, hashedPassword: string, avatar: string) {
	const stmt = db.prepare(`
		INSERT INTO users (username, password, avatar, created_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)
	`);
	const result = stmt.run(username, hashedPassword, avatar);
	if (result.changes === 0)                                                                      // If DB run fails, throws error
		throw new Error(`[DB] Failed to register user ${username}`);
	else
		console.log(`[DB] Registered new user ${username}`);
}

export function updateUsernameDB(username: string, newUsername: string) {
	const stmt = db.prepare(`
		UPDATE users
		SET username = ?
		WHERE username = ?
	`);
	const result = stmt.run(newUsername, username);
	if (result.changes === 0)                                                                      // If DB run fails, throws error
		throw new Error(`[DB] Failed to update username for user ${username}`);
	else
		console.log(`[DB] Username updated for user ${username}`);
}

export function updatePasswordDB(username: string, hashedPassword: string) {
	const stmt = db.prepare(`
		UPDATE users
		SET password = ?
		WHERE username = ?
	`);
	const result = stmt.run(hashedPassword, username);
	if (result.changes === 0)                                                                      // If DB run fails, throws error
		throw new Error(`[DB] Failed to update password for user ${username}`);
	else
		console.log(`[DB] Password updated for user ${username}`);
}

export function updateAvatarDB(username: string, avatar: string) {
	const stmt = db.prepare(`
		UPDATE users
		SET avatar = ?
		WHERE username = ?
	`);
	const result = stmt.run(avatar, username);
	if (result.changes === 0)                                                                      // If DB run fails, throws error
		throw new Error(`[DB] Failed to update avatar for user ${username}`);
	else
		console.log(`[DB] Avatar updated for user ${username}`);
}

export function updateFriendsDB(username: string, friends: string) {
	const stmt = db.prepare(`
		UPDATE users
		SET friends = ?
		WHERE username = ?
	`);
	const result = stmt.run(friends, username);
	if (result.changes === 0)                                                                      // If DB run fails, throws error
		throw new Error(`[DB] Failed to update friends for user ${username}`);
	else
		console.log(`[DB] Friends updated for user ${username}`);
}

export function updateStatsDB(username: string, stats: string) {
	const stmt = db.prepare(`
		UPDATE users
		SET stats = ?
		WHERE username = ?
	`);
	const result = stmt.run(stats, username);
	if (result.changes === 0)                                                                      // If DB run fails, throws error
		throw new Error(`[DB] Failed to update stats for user ${username}`);
	else
		console.log(`[DB] Stats updated for user ${username}`);
}