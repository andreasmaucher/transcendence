// Global variables

import { chatHistory } from "../chat/types";

export const generalData = {
	onlineUsers: null as string[] | null,
};

export const userData = {
	username: null as string | null,
	userSock: null as WebSocket | null,
	gameSock: null as WebSocket | null,
	chatHistory: null as chatHistory | null,
	friends: null as string[] | null,
	blockedUsers: null as string[] | null,
};
