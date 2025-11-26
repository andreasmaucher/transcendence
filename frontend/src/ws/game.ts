import { ROOM_ID, WS_HOST, WS_PORT, WS_PROTOCOL } from "../config/endpoints";
import { flushInputs, queueInput, setActiveSocket, setAssignedSide } from "../game/input";
import { applyBackendState } from "../game/state";
import { MatchState } from "../types/game";
import { Payload } from "../types/ws_message";

// no-op functions to avoid errors as long as the UI has not registered handlers by calling registerGameUiHandlers
let waitingForPlayers: () => void = () => {};
let countdownToGame: (n: number, side?: "left" | "right") => void = () => {};
let startGame: () => void = () => {};

// function that registers the UI handlers (replaces the no-op functions above with the actual handlers)
export function registerGameUiHandlers(handlers: {
	waitingForPlayers?: () => void;
	countdownToGame?: (n: number, side?: "left" | "right") => void;
	startGame?: () => void;
}) {
	if (handlers.waitingForPlayers) waitingForPlayers = handlers.waitingForPlayers;
	if (handlers.countdownToGame) countdownToGame = handlers.countdownToGame;
	if (handlers.startGame) startGame = handlers.startGame;
}

export function connectToLocalSingleGameWS(state: MatchState): () => void {
	const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/local-single-game/${ROOM_ID}/ws`;

	const ws = new WebSocket(wsUrl);
	setActiveSocket(ws);
	setAssignedSide(null); // Local game: control both paddles

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

			case "waiting": {
				// notify UI that we are waiting for other player(s)
				waitingForPlayers();
				break;
			}

			case "countdown": {
				// extract the countdown value
				const n = (payload as any).data?.value as number | undefined;
				// extract the side of the player
				const side = (payload as any).data?.side as "left" | "right" | undefined;
				countdownToGame(n ?? 0, side);
				break;
			}

			case "start": {
				startGame();
				break;
			}

		/* 	case "chat":
				addChatMessage(payload.data.from, payload.data.message);
				break; */

			default:
				console.warn("[WS] Unknown payload:", payload);
				break;
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

//! LOGIC why WS and where is target room id from not there before
export function connectToSingleGameWS(state: MatchState, roomId?: string): () => void {
	const targetRoomId = roomId ?? ROOM_ID;
	const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/single-game/${targetRoomId}/ws`;

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
			case "match-assigned": {
				//! LOGIC
				// Server tells us which side we're playing on
				const data = (payload as any).data;
				console.log(`[WS] Assigned to match ${data?.matchId} as ${data?.playerSide}`);
				setAssignedSide(data?.playerSide || null);
				break;
			}

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

			case "waiting": {
				waitingForPlayers();
				break;
			}

			case "countdown": {
				const n = (payload as any).data?.value as number | undefined;
				const side = (payload as any).data?.side as "left" | "right" | undefined;
				countdownToGame(n ?? 0, side);
				break;
			}

			case "start": {
				startGame();
				break;
			}

			/* 	case "chat":
				addChatMessage(payload.data.from, payload.data.message);
				break; */

			default:
				console.warn("[WS] Unknown payload:", payload);
				break;
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

//! LOGIC added room id here
export function connectToTournamentWS(state: MatchState, roomId?: string, tournamentName?: string): () => void {
	const targetRoomId = roomId ?? ROOM_ID;
	//! LOGIC
	// add tournament name as query parameter if provided
	const nameParam = tournamentName ? `?name=${encodeURIComponent(tournamentName)}` : '';
	const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/tournament/${targetRoomId}/ws${nameParam}`;

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
			case "match-assigned": {
				//! LOGIC
				// Server tells us which side we're playing on
				const data = (payload as any).data;
				console.log(`[WS] Assigned to match ${data?.matchId} as ${data?.playerSide}`);
				setAssignedSide(data?.playerSide || null);
				break;
			}

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

			case "waiting": {
				waitingForPlayers();
				break;
			}

			case "countdown": {
				const n = (payload as any).data?.value as number | undefined;
				const side = (payload as any).data?.side as "left" | "right" | undefined;
				countdownToGame(n ?? 0, side);
				break;
			}

			case "start": {
				startGame();
				break;
			}
			/* 	case "chat":
				addChatMessage(payload.data.from, payload.data.message);
				break; */

			default:
				console.warn("[WS] Unknown payload:", payload);
				break;
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
