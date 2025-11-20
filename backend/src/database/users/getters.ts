import db from "../db_init.js";

// Retrieve all users from the database
export function getAllUsersDB(): any[] {
	const stmt = db.prepare(`
    SELECT *
    FROM users
    ORDER BY internal_id ASC
  `);

	const users = stmt.all();
	if (!users) throw new Error(`[DB] No users found`);

	return users;
}

// Retrieve the desired user from the database (if present) and return it as json
export function getUserByUsernameDB(username: string): any {
	const stmt = db.prepare(`
		SELECT *
		FROM users
		WHERE username = ?
	`);

	const result = stmt.get(username); // returns one row or undefined
	if (!result) throw new Error(`[DB] User ${username} not found`);

	return result;
}

// Check if the username is already present in the database (if present)
export function getUsernameDB(username: string): boolean {
	const stmt = db.prepare(`
		SELECT 1
		FROM users
		WHERE username = ?
	`);

	const json: any = stmt.get(username); // returns one row or undefined

	return !!json; // Convert to boolean
}

// Retrieve the frieds of the user
export function getUserFriendsDB(username: string): string[] {
	const stmt = db.prepare(`SELECT friends FROM users WHERE username = ?`);

	const result: any = stmt.get(username); // returns one row or undefined
	if (!result) throw new Error(`[DB] Friends of ${username} not found`);

	const friends: string[] = JSON.parse(result.friends);

	return friends;
}

//OAUTH
// Retrieve the username of a GithubUser
export function getGithubUserByProviderIdDB(providerId: string): string | undefined {
	const stmt = db.prepare(`
		SELECT username
		FROM users
		WHERE provider = 'github' AND provider_id = ?
		LIMIT 1
	`);

	const result: any = stmt.get(providerId);

	return result ? result.username : undefined;
}
