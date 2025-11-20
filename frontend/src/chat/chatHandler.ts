import { sockets } from "../config/constants";
import { ChatEvent, Message } from "./types";

export function handleMessage(type: ChatEvent, content: string) {
	const message: Message = {
		id: undefined,
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
