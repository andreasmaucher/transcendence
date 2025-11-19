import {
	checkIfTournamentMessagesDB,
	getAllGlobalMessagesDB,
	getPrivateUserMessagesDB,
	getTournamentMessagesDB,
} from "../database/messages/getters.js";
import { chatHistory, Message } from "../types/chat.js";

export function convertToMessageArray(rawMessages: any[]): Message[] {
	const messages: Message[] = [];
	for (const rawMessage of rawMessages) {
		messages.push(convertToMessage(rawMessage));
	}
	return messages;
}

export function convertToMessage(rawMessage: any): Message {
	const message: Message = {
		id: rawMessage.id,
		sender: rawMessage.sender,
		receiver: rawMessage.receiver,
		type: rawMessage.type,
		gameId: rawMessage.game_id,
		content: rawMessage.content,
		sentAt: rawMessage.sent_at,
	};
	return message;
}

export function populatePrivateConv(username: string, privateConvs: Map<string, Message[]>) {
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
