import { sockets } from "../config/constants";
import { ChatEvent, Message } from "./types";

export function handleMessage(type: ChatEvent, content: string) {
	const messageId = crypto.randomUUID();
	const message: Message = {
		id: messageId,
		sender: sockets.username!,
		receiver: undefined,
		type: type,
		content: content,
		gameId: undefined,
		sentAt: undefined,
	};
	if (sockets.user?.readyState === WebSocket.OPEN) {
		sockets.user.send(JSON.stringify(message));
		console.log("Message sent");
	}
}
