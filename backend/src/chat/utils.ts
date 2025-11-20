import { Message } from "../types/chat.js";

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
		gameId: rawMessage.game_id ?? rawMessage.gameId,
		content: rawMessage.content,
		sentAt: rawMessage.sent_at ?? rawMessage.sentAt,
	};
	return message;
}
