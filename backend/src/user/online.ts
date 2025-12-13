import { usersOnline } from "../config/structures.js";
import { getUserByUsernameDB } from "../database/users/getters.js";
import { userBroadcast } from "../transport/broadcaster.js";
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
	if (!userDB) return undefined;

	const existing = usersOnline.get(userDB.username);
	if (existing?.userWS && existing.userWS !== socket) {
		console.log(`USER ALREADY ONLINE → replacing socket for ${userDB.username}`);
		try {
			existing.userWS.close(4000, "Replaced by new connection");
		} catch {}
	}

	const user: User = {
		username: userDB.username,
		provider: userDB.provider,
		providerId: userDB.provider_id,
		avatar: userDB.avatar,
		userWS: socket,
		isAlive: true,
		createdAt: userDB.created_at,
	};

	const wasOnline = usersOnline.has(user.username);
	usersOnline.set(user.username, user);
	if (!wasOnline) {
		console.log(`User ${user.username} is now online`);
		// Notify that user is online to other online users
		userBroadcast("user-online", { username: user.username });
	}

	return user;
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

export function removeUserOnline(username: string, socket?: WebSocket) {
	if (!isUserOnline(username)) return;

	if (socket) {
		const current = usersOnline.get(username);
		// Only remove if the closing socket is still the active one
		if (current?.userWS && current.userWS !== socket) return;
	}

	usersOnline.delete(username);
	console.log(`User ${username} is now offline`);

	// Notify that user is offline to other online users
	userBroadcast("user-offline", { username: username });
}

// Return user data from usersOnline Map structure (if present)
export function getUserOnline(username: string): User | undefined {
	if (isUserOnline(username)) return usersOnline.get(username);
	else return undefined;
}

export function getAllOnlineUsers(): string[] {
	return Array.from(usersOnline.keys());
}
