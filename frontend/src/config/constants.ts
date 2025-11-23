// globalSocket.ts
export const sockets = {
	username: null as string | null,
	user: null as WebSocket | null,
	game: null as WebSocket | null,
	friendsList: null as string[] | null,
	blockedUsersList: null as string[] | null 
};
