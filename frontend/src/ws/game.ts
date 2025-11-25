import { ROOM_ID, WS_HOST, WS_PORT, WS_PROTOCOL } from "../config/endpoints";
import { flushInputs, queueInput, setActiveSocket } from "../game/input";
import { applyBackendState } from "../game/state";
import { MatchState } from "../types/game";
import { Payload } from "../types/ws_message";

export function connectToLocalSingleGameWS(state: MatchState): () => void {
	const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/local-single-game/${ROOM_ID}/ws`;
	console.log("URL: ", wsUrl);

	const ws = new WebSocket(wsUrl);
	setActiveSocket(ws);

	let resetRequested = false;

	ws.addEventListener("open", () => {
		queueInput("left", "stop");
		queueInput("right", "stop");
		flushInputs();
	});

	ws.addEventListener("message", (event) => {
		let parsed: any;

		try {
			parsed = JSON.parse(event.data);
		} catch {
			return; // ignore invalid JSON
		}

		if (!parsed || typeof parsed !== "object") return;

		const payload = parsed as Payload;

		switch (payload.type) {
			case "state": {
				const wasOver = state.isOver;

				// payload.data is now MatchState
				applyBackendState(state, payload.data);

				// Reset game
				if (state.isOver && !wasOver && !resetRequested) {
					ws.send(JSON.stringify({ type: "reset" }));
					resetRequested = true;
				} else if (!state.isOver) {
					resetRequested = false;
				}
				break;
			}

			/* case "waiting":
				waitingForPlayers();
				break;

			case "countdown":
				countdownToGame(payload.data.value);
				break;

			case "start":
				startGame();
				break;

			case "chat":
				addChatMessage(payload.data.from, payload.data.message);
				break;

			default:
				console.warn("Unknown payload", payload); */
		}
	});

	ws.addEventListener("close", () => {
		setActiveSocket(null);
		resetRequested = false;
		setTimeout(() => connectToLocalSingleGameWS(state), 1000);
	});

	ws.addEventListener("error", () => ws.close());

	// <-- return cleanup function
	return () => ws.close();
}

export function connectToSingleGameWS(state: MatchState): () => void {
	const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/single-game/${ROOM_ID}/ws`;

	const ws = new WebSocket(wsUrl);
	setActiveSocket(ws);

	let resetRequested = false;

	ws.addEventListener("open", () => {
		queueInput("left", "stop");
		queueInput("right", "stop");
		flushInputs();
	});

	ws.addEventListener("message", (event) => {
		let parsed: any;

		try {
			parsed = JSON.parse(event.data);
		} catch {
			return; // ignore invalid JSON
		}

		if (!parsed || typeof parsed !== "object") return;

		const payload = parsed as Payload;

		switch (payload.type) {
			case "state": {
				const wasOver = state.isOver;

				// payload.data is now MatchState
				applyBackendState(state, payload.data);

				// Reset game
				if (state.isOver && !wasOver && !resetRequested) {
					ws.send(JSON.stringify({ type: "reset" }));
					resetRequested = true;
				} else if (!state.isOver) {
					resetRequested = false;
				}
				break;
			}

			/* case "waiting":
				waitingForPlayers();
				break;

			case "countdown":
				countdownToGame(payload.data.value);
				break;

			case "start":
				startGame();
				break;

			case "chat":
				addChatMessage(payload.data.from, payload.data.message);
				break;

			default:
				console.warn("Unknown payload", payload); */
		}
	});

	ws.addEventListener("close", () => {
		setActiveSocket(null);
		resetRequested = false;
		setTimeout(() => connectToSingleGameWS(state), 1000);
	});

	ws.addEventListener("error", () => ws.close());

	// <-- return cleanup function
	return () => ws.close();
}

export function connectToTournamentWS(state: MatchState): () => void {
	const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/tournament/${ROOM_ID}/ws`;

	const ws = new WebSocket(wsUrl);
	setActiveSocket(ws);

	let resetRequested = false;

	ws.addEventListener("open", () => {
		queueInput("left", "stop");
		queueInput("right", "stop");
		flushInputs();
	});

	ws.addEventListener("message", (event) => {
		let parsed: any;

		try {
			parsed = JSON.parse(event.data);
		} catch {
			return; // ignore invalid JSON
		}

		if (!parsed || typeof parsed !== "object") return;

		const payload = parsed as Payload;

		switch (payload.type) {
			case "state": {
				const wasOver = state.isOver;

				// payload.data is now MatchState
				applyBackendState(state, payload.data);

				// Reset game
				if (state.isOver && !wasOver && !resetRequested) {
					ws.send(JSON.stringify({ type: "reset" }));
					resetRequested = true;
				} else if (!state.isOver) {
					resetRequested = false;
				}
				break;
			}

			/* case "waiting":
				waitingForPlayers();
				break;

			case "countdown":
				countdownToGame(payload.data.value);
				break;

			case "start":
				startGame();
				break;

			case "chat":
				addChatMessage(payload.data.from, payload.data.message);
				break;

			default:
				console.warn("Unknown payload", payload); */
		}
	});

	ws.addEventListener("close", () => {
		setActiveSocket(null);
		resetRequested = false;
		setTimeout(() => connectToTournamentWS(state), 1000);
	});

	ws.addEventListener("error", () => ws.close());

	// <-- return cleanup function
	return () => ws.close();
}
