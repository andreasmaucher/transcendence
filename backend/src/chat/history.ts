import { getAllGlobalMessagesDB } from "../database/messages/getters.js";
import { chatHistory } from "../types/chat.js";

export function buildChatHistory(username: string): chatHistory {
	const chatHistory = {
		user: username,
		global: [],
		private: new Map(),
	};
	try {
		const globalMessages = getAllGlobalMessagesDB();
		if (globalMessages)
			chatHistory.global = globalMessages;
	} catch (error: any) {
		console.log(error.message);
	}
	return chatHistory;
}
