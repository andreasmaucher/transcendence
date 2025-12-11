import { convertToMessageArray } from "../chat/utils.js";
import {
	checkIfTournamentMessagesDB,
	getAllGlobalMessagesDB,
	getPrivateUserMessagesDB,
	getTournamentMessagesDB,
} from "../database/messages/getters.js";
import { chatHistoryBE } from "../types/chat.js";

export function buildChatHistory(username: string): chatHistoryBE {
	const chatHistory: chatHistoryBE = {
		user: username,
		global: [],
		private: [],
		tournament: [],
	};
	try {
		chatHistory.global = convertToMessageArray(getAllGlobalMessagesDB());
		chatHistory.private = convertToMessageArray(getPrivateUserMessagesDB(username));
		const gameId = checkIfTournamentMessagesDB(username);
		if (gameId) chatHistory.tournament = convertToMessageArray(getTournamentMessagesDB(gameId));
	} catch (error: any) {
		console.log(error.message);
	}
	return chatHistory;
}
