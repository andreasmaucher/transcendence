import { usersOnline } from "../config/structures.js";
import { getUserByUsernameDB } from "../database/users/getters.js";
import { userBroadcast } from "../transport/broadcaster.js";
import { User } from "../types/user.js";
import type WebSocket from "ws";

export function isUserAlreadyInGame(username: string): boolean {
	const user = usersOnline.get(username);
	if (!user) return false;
	if (user.gameWS) return true;
	return false;
}

// Check if user is in the usersOnline map structure
export function isUserOnline(username: string): boolean {
	const online = usersOnline.get(username);
	return !!online;
}

// Add user to the usersOnline map structure (if not already there)
export function addUserOnline(username: string, socket: WebSocket): User | undefined {
	let user = usersOnline.get(username);

	if (user) {
		// Case A: User is already online (opened a new tab)
		// Add the new socket to the map and mark it as alive
		user.connections.set(socket, true);
		return user;
	} else {
		// Case B: User is coming online for the first time
		const userDB = getUserByUsernameDB(username);

		if (userDB) {
			user = {
				username: userDB.username,
				provider: userDB.provider,
				providerId: userDB.provider_id,
				avatar: userDB.avatar,
				createdAt: userDB.created_at,

				// Initialize the Map with this first socket
				connections: new Map([[socket, true]]),
			};

			usersOnline.set(user.username, user);
			console.log(`User ${user.username} is now online`);

			// Notify friends
			userBroadcast("user-online", { username: user.username });

			return user;
		} else {
			return undefined;
		}
	}
}

// Add the game socket and the game id to the userOnline structure
export function addGameToUser(username: string, gameWS: WebSocket, gameId: string) {
	const user = usersOnline.get(username);
	if (user) {
		user.gameWS = gameWS;
		user.gameId = gameId;
	}
}

// Remove the game socket and the game id from the userOnline structure
export function removeGameFromUser(username: string): void {
	const user = usersOnline.get(username);
	if (user) {
		user.gameWS = undefined;
		user.gameId = undefined;
	}
}

// Update information (username and avatar) stored in the usersOnline map structure
export function updateUserOnline(username: string, newAvatar: string) {
	const user = usersOnline.get(username);
	if (user) user.avatar = newAvatar;
}

// Remove user from usersOnline map structure
export function removeUserWS(username: string, socket: WebSocket) {
	const user = usersOnline.get(username);

	if (!user) return;

	// Remove the specific socket
	user.connections.delete(socket);

	// Check if that was the last one
	if (user.connections.size === 0) {
		usersOnline.delete(username);
		console.log(`User ${username} is now offline`);

		// Notify others
		userBroadcast("user-offline", { username: username });
	}
}

export function userLogout(username: string) {
	const user = usersOnline.get(username);
	if (!user) return;

	// Remove the user from the global map
	usersOnline.delete(username);

	console.log(`Logging out ${username} from all devices`);

	// Broadcast to friends that the user is offline
	userBroadcast("user-offline", { username });

	// Iterate over the sockets
	for (const socket of user.connections.keys()) {
		try {
			// Close the connection
			socket.close(1000, "User logged out");
		} catch (err) {
			// Socket might already be closed, ignore error
		}
	}

	// Clear the map for good measure (helps garbage collection)
	user.connections.clear();
}

export function getAllOnlineUsers(): string[] {
	return Array.from(usersOnline.keys());
}

export function removeUserOnline(username: string) {
	userLogout(username);
}
