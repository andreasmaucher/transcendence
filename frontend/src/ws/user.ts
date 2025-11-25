import { Message } from "../chat/types";
import { sockets } from "../config/constants";
import { WS_HOST, WS_PORT, WS_PROTOCOL } from "../config/endpoints";
import { Payload } from "../types/ws_message";

export function connectToUserWS(username: string) {
	const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/user/ws`;

	const ws = new WebSocket(wsUrl);

	ws.addEventListener("open", () => {
		console.log("[USER WS] Connected");
	});

	sockets.user = ws;
	sockets.username = username;

	ws.addEventListener("message", (event) => {
		let parsed: Message;

		try {
			parsed = JSON.parse(event.data);
		} catch {
			return;
		}

		if (!parsed || typeof parsed !== "object") return;
	});

	ws.addEventListener("close", () => {
		console.log("[USER WS] Disconnected — retrying...");
		setTimeout(() => connectToUserWS(username), 1000);
	});

	ws.addEventListener("error", () => ws.close());

	return () => ws.close();
}
