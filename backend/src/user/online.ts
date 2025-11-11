import { usersOnline } from "../config/structures.js";
import { getJsonUserByUsername } from "../database/users/getters.js";
import { User } from "../types/user.js";

export function getCurrentDateTime(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const seconds = String(now.getSeconds()).padStart(2, "0");
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Check if user is in the usersOnline map structure
export function isUserOnline(username: string): boolean {
	const online = usersOnline.get(username);
	return !!online;
}

// Add user to the usersOnline map structure (if not already there)
export function addUserOnline(username: string, socket: WebSocket) {
	const userDB = getJsonUserByUsername(username);
	if (userDB && !isUserOnline(userDB.username)) {
		const user = {
			username: userDB.username,
			provider: userDB.provider,
			provider_id: userDB.provider_id,
			avatar: userDB.avatar,
			socket: socket,
		} as User;

		usersOnline.set(user.username, user);
		console.log(`User ${user.username} is now online`);
	}
}

// Update information (username and avatar) stored in the usersOnline map structure
export function updateUserOnline({
	username,
	newUsername,
	newAvatar,
	newPing,
}: {
	username: string;
	newUsername?: string;
	newAvatar?: string;
	newPing?: string;
}) {
	if (isUserOnline(username)) {
		const user = usersOnline.get(username);
		if (user && newUsername) {
			user.username = newUsername;
			usersOnline.delete(username);
			usersOnline.set(newUsername, user);
		} else if (user && newAvatar) user.avatar = newAvatar;
		else if (user && newPing) user.lastPing = newPing;
	}
}

// Remove user from usersOnline map structure
export function removeUserOnline(username: string) {
	if (!isUserOnline(username)) return;

	usersOnline.delete(username);
	console.log(`User ${username} is now offline`);
}

export function getUserOnline(username: string): User | undefined {
	if (isUserOnline(username)) return usersOnline.get(username);
	else return undefined;
}
