import db from "../db_init.js";
import type { User } from "../../types/utils.js";

// Retrieve all users from the database
export function getAllUsers(): any[] {
	const stmt = db.prepare(`
    SELECT internal_id, username, avatar, provider, provider_id, friends, stats, created_at
    FROM users
    ORDER BY internal_id ASC
  `);

	const users = stmt.all();
	if (!users) throw new Error(`[DB] No users found`);

	return users;
}

// Retrieve the desired user from the database (if present) and return it as json
export function getJsonUserByUsername(username: string): any {
	const stmt = db.prepare(`
		SELECT *
		FROM users
		WHERE username = ?
	`);

	const result = stmt.get(username); // returns one row or undefined
	if (!result) throw new Error(`[DB] User ${username} not found`);

	return result;
}

// Retrieve the desired user from the database (if present) and return it as User type
export function getUserByUsername(username: string): User | undefined {
	const stmt = db.prepare(`
		SELECT *
		FROM users
		WHERE username = ?
	`);

	const json: any = stmt.get(username); // returns one row or undefined
	if (!json) throw new Error(`[DB] User ${username} not found`);

	const user: User = {
		internal_id: json.internal_id,
		username: json.username,
		password: json.password,
		provider: json.provider,
		provider_id: json.provider_id,
		avatar: json.avatar,
		friends: json.friends,
		stats: json.stats,
		created_at: json.created_at,
	};
	return user;
}

// Check if the username is already present in the database (if present)
export function getUsername(username: string): boolean {
	const stmt = db.prepare(`
		SELECT 1
		FROM users
		WHERE username = ?
	`);

	const json: any = stmt.get(username); // returns one row or undefined

	return !!json; // Convert to boolean
}

// Retrieve the frieds of the user
export function getUserFriends(username: string): string[] {
	const stmt = db.prepare(`SELECT friends FROM users WHERE username = ?`);

	const result: any = stmt.get(username); // returns one row or undefined
	if (!result) throw new Error(`[DB] Friends of ${username} not found`);

	const friends: string[] = JSON.parse(result.friends);

	return friends;
}
