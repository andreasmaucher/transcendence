import db from "../db_init.js";
import type { User } from "../../types/utils.js";

// Retrieve the desired user from the database (if present) and return it as json
export function getJsonUserByUsername(username: string) {
	const stmt = db.prepare(`
		SELECT *
		FROM users
		WHERE username = ?
	`);
	return stmt.get(username); // returns one row or undefined
}

// Retrieve the desired user from the database (if present) and return it as User type
export function getUserByUsername(username: string) : User | undefined {
	const stmt = db.prepare(`
		SELECT *
		FROM users
		WHERE username = ?
	`);
	const json: any = stmt.get(username); // returns one row or undefined
	if (json) {
		let user: User = {
			id: json.id,
			username: json.username,
			password: json.password,
			avatar: json.avatar,
			friends: json.friends,
			stats: json.stats,
			created_at: json.created_at,
		}
		return user;
	}
	else
		return undefined;
}

// Check if the username is already present in the database (if present)
export function getUsername(username: string) {
	const stmt = db.prepare(`
		SELECT *
		FROM users
		WHERE username = ?
	`);
	const json: any = stmt.get(username); // returns one row or undefined
	if (json)
		return json.username;
	else
		return undefined;
}

