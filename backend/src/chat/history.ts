import {
	checkIfTournamentMessagesDB,
	getAllGlobalMessagesDB,
	getPrivateUserMessagesDB,
	getTournamentMessagesDB,
} from "../database/messages/getters.js";
import { chatHistory, ChatMessage } from "../types/chat.js";
import { convertToMessage, convertToMessageArray } from "./utils.js";

export function populatePrivateConv(username: string, privateConvs: Map<string, ChatMessage[]>) {
	const privateMessages = getPrivateUserMessagesDB(username);

	for (const message of privateMessages) {
		const otherUser = message.sender === username ? message.receiver : message.sender;

		if (!otherUser) continue;

		if (!privateConvs.has(otherUser)) privateConvs.set(otherUser, []);

		privateConvs.get(otherUser)!.push(convertToMessage(message));
	}
}

export function buildChatHistory(username: string): chatHistory {
	const chatHistory: chatHistory = {
		user: username,
		global: [],
		private: new Map(),
		tournament: [],
	};
	try {
		chatHistory.global = convertToMessageArray(getAllGlobalMessagesDB());
		populatePrivateConv(username, chatHistory.private);
		const gameId = checkIfTournamentMessagesDB(username);
		if (gameId) chatHistory.tournament = convertToMessageArray(getTournamentMessagesDB(gameId));
	} catch (error: any) {
		console.log(error.message);
	}
	return chatHistory;
}
