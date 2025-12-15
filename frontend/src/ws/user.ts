import { userData } from "../config/constants";
import { WS_HOST, WS_PORT, WS_PROTOCOL } from "../config/endpoints";

export function connectToUserWS(username: string) {
	if (userData.userSock && userData.userSock.readyState === WebSocket.OPEN) {
		console.log("[USER WS] Already connected. Skipping reconnect.");
		return () => {};
	}

	const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/user/ws`;

	const ws = new WebSocket(wsUrl);

	ws.addEventListener("open", () => {
		console.log("[USER WS] Connected");
	});

	userData.userSock = ws;
	userData.username = username;

	ws.addEventListener("message", (event) => {
		try {
			const parsed = JSON.parse(event.data);
			if (!parsed || typeof parsed !== "object") return;

			const customEvent = new CustomEvent("socket-message", { detail: parsed });
			document.dispatchEvent(customEvent);

		} catch (err) {
			console.error("[USER WS] Parsing error", err);
		}
	});

	ws.addEventListener("close", () => {
		console.log("[USER WS] Disconnected.");
		//OLD
		//setTimeout(() => connectToUserWS(username), 1000);
	});

	ws.addEventListener("error", () => {}); // error logic will be implemented

	return () => {};
}

// HELPER 
export function disconnectUserWS() {
	if (userData.userSock) {
		userData.userSock.close();
		userData.userSock = null;
	}
}
