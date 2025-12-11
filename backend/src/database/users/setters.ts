import db from "../db_init.js";
import crypto from "crypto";

// Add (register) a new user to the database
export function registerUserDB(username: string, hashedPassword: string, avatar: string) {
	const stmt = db.prepare(`
		INSERT INTO users (username, password, avatar, created_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)
	`);
	const result = stmt.run(username, hashedPassword, avatar);
	if (result.changes === 0)
		throw new Error(`[DB] Failed to register user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Registered new user ${username}`);
}

// Update the username column
export function updateUsernameDB(username: string, newUsername: string) {
	const stmt = db.prepare(`
		UPDATE users
		SET username = ?
		WHERE username = ?
	`);
	const result = stmt.run(newUsername, username);
	if (result.changes === 0)
		throw new Error(`[DB] Failed to update username for user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Username updated for user ${username}`);
}

// Update the password column
export function updatePasswordDB(username: string, hashedPassword: string) {
	const stmt = db.prepare(`
		UPDATE users
		SET password = ?
		WHERE username = ?
	`);
	const result = stmt.run(hashedPassword, username);
	if (result.changes === 0)
		throw new Error(`[DB] Failed to update password for user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Password updated for user ${username}`);
}

// Update the avatar column
export function updateAvatarDB(username: string, avatar: string) {
	const stmt = db.prepare(`
		UPDATE users
		SET avatar = ?
		WHERE username = ?
	`);
	const result = stmt.run(avatar, username);
	if (result.changes === 0)
		throw new Error(`[DB] Failed to update avatar for user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Avatar updated for user ${username}`);
}

// Add a friend (ID) to the friends column
export function addFriendDB(username: string, friend: string) {
	const json: any = db.prepare(`SELECT friends FROM users WHERE username = ?`).get(username);

	// Parse the JSON
	const friends = JSON.parse(json.friends);

	// Avoid duplicates
	if (!friends.includes(friend)) friends.push(friend);

	// Update back into the DB
	const stmt = db.prepare("UPDATE users SET friends = ? WHERE username = ?");
	const result = stmt.run(JSON.stringify(friends), username);
	if (result.changes === 0)
		throw new Error(`[DB] Failed to add friend ${friend} to user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Friend ${friend} added to user ${username}`);
}

// Remove friend (ID) from the friends column
export function removeFriendDB(username: string, friend: string) {
	const json: any = db.prepare(`SELECT friends FROM users WHERE username = ?`).get(username);

	// Parse the JSON
	const friends = JSON.parse(json.friends);

	// Remove a friend
	const updatedFriends = friends.filter((f: string) => f !== friend);

	// Update back into the DB
	const stmt = db.prepare("UPDATE users SET friends = ? WHERE username = ?");
	const result = stmt.run(JSON.stringify(updatedFriends), username);
	if (result.changes === 0)
		throw new Error(`[DB] Failed to remove friend ${friend} from user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Friend ${friend} removed from user ${username}`);
}

// Add an user (ID) to the blocked column
export function blockUserDB(username: string, enemy: string) {
	const json: any = db.prepare(`SELECT blocked FROM users WHERE username = ?`).get(username);

	// Parse the JSON
	const blocked = JSON.parse(json.blocked);

	// Avoid duplicates
	if (!blocked.includes(enemy)) blocked.push(enemy);

	// Update back into the DB
	const stmt = db.prepare("UPDATE users SET blocked = ? WHERE username = ?");
	const result = stmt.run(JSON.stringify(blocked), username);
	if (result.changes === 0)
		throw new Error(`[DB] Failed to block ${enemy} for user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] User ${enemy} blocked for user ${username}`);
}

// Remove an user (ID) from the blocked column
export function unblockUserDB(username: string, enemy: string) {
	const json: any = db.prepare(`SELECT blocked FROM users WHERE username = ?`).get(username);

	// Parse the JSON
	const blocked = JSON.parse(json.blocked);

	// Remove a friend
	const updatedBlocked = blocked.filter((f: string) => f !== enemy);

	// Update back into the DB
	const stmt = db.prepare("UPDATE users SET blocked = ? WHERE username = ?");
	const result = stmt.run(JSON.stringify(updatedBlocked), username);
	if (result.changes === 0)
		throw new Error(`[DB] Failed to unblock ${enemy} for user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] User ${enemy} unblocked for user ${username}`);
}

export function updateStatsDB(username: string, stats: string) {
	const stmt = db.prepare(`
		UPDATE users
		SET stats = ?
		WHERE username = ?
	`);
	const result = stmt.run(stats, username);
	if (result.changes === 0)
		throw new Error(`[DB] Failed to update stats for user ${username}`); // If DB run fails, throws error
	else console.log(`[DB] Stats updated for user ${username}`);
}

// Remove an user from the database
export function removeUserDB(username: string): void {
	const stmt = db.prepare("DELETE FROM users WHERE username = ?");
	stmt.run(username);
}

//OAUTH
// Insert a new GitHub OAuth user into the database
export function registerGithubUserDB(username: string, providerId: string, avatar?: string) {
	const stmt = db.prepare(`
		INSERT INTO users (username, password, provider, provider_id, avatar, created_at)
		VALUES (?, ?, 'github', ?, ?, CURRENT_TIMESTAMP)
	`);

	// placeholder password is ignored for OAuth users
	const placeholderPassword = crypto.randomBytes(32).toString("hex");

	const result = stmt.run(username, placeholderPassword, providerId, avatar);

	if (result.changes === 0) throw new Error(`[DB] Failed to register GitHub user ${username}`);
	else console.log(`[DB] Registered new GitHub user ${username}`);
}
