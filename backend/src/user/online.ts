import { usersOnline } from "../config/structures.js";
import { getUserByUsernameDB } from "../database/users/getters.js";
import { User } from "../types/user.js";
import type WebSocket from "ws";

// Check if user is in the usersOnline map structure
export function isUserOnline(username: string): boolean {
	const online = usersOnline.get(username);
	return !!online;
}

// Add user to the usersOnline map structure (if not already there)
export function addUserOnline(username: string, socket: WebSocket): User | undefined {
	const userDB = getUserByUsernameDB(username);
	if (userDB && !isUserOnline(userDB.username)) {
		const user: User = {
			username: userDB.username,
			provider: userDB.provider,
			providerId: userDB.provider_id,
			avatar: userDB.avatar,
			userWS: socket,
			isAlive: true,
			friends: JSON.parse(userDB.friends),
			blocked: JSON.parse(userDB.blocked),
			createdAt: userDB.created_at,
		};

		usersOnline.set(user.username, user);
		console.log(`User ${user.username} is now online`);
		return user;
	} else return undefined;
}

// Add the game socket and the game id to the userOnline structure
export function addGameToUser(username: string, gameWS: WebSocket, gameId: string) {
	const user = getUserOnline(username);
	if (user) {
		user.gameWS = gameWS;
		user.gameId = gameId;
	}
}

// Remove the game socket and the game id from the userOnline structure
export function removeGameFromUser(username: string): void {
	const user = getUserOnline(username);
	if (user) {
		user.gameWS = undefined;
		user.gameId = undefined;
	}
}

// Update information (username and avatar) stored in the usersOnline map structure
export function updateUserOnline({
	username,
	newUsername,
	newAvatar,
}: {
	username: string;
	newUsername?: string;
	newAvatar?: string;
}) {
	if (isUserOnline(username)) {
		const user = usersOnline.get(username);
		if (user && newUsername) {
			user.username = newUsername;
			usersOnline.delete(username);
			usersOnline.set(newUsername, user);
		} else if (user && newAvatar) user.avatar = newAvatar;
	}
}

// Remove user from usersOnline map structure
export function removeUserOnline(username: string) {
	if (!isUserOnline(username)) return;

	usersOnline.delete(username);
	console.log(`User ${username} is now offline`);
}

// Return user data from usersOnline Map structure (if present)
export function getUserOnline(username: string): User | undefined {
	if (isUserOnline(username)) return usersOnline.get(username);
	else return undefined;
}

export function getAllOnlineUsers(): User[] {
	const allOnlineUsers = Array.from(usersOnline.values());
	return allOnlineUsers;
}
