//// filepath: /Users/mrizhakov/Documents/42/transcendence/frontend/src/ws/game.ts
import { userData } from "../config/constants";
import { ROOM_ID, WS_BASE } from "../config/endpoints";
import { flushInputs, queueInput, setActiveSocket, setAssignedSide } from "../game/input";
import { applyBackendState } from "../game/state";
import { MatchState } from "../types/game";
import { Payload } from "../types/ws_message";

// no-op functions to avoid errors as long as the UI has not registered handlers by calling registerGameUiHandlers

let waitingForPlayers: () => void = () => {};
let countdownToGame: (n: number, side?: "left" | "right") => void = () => {};
let startGame: () => void = () => {};
let tournamentMatchType: (type: string, round: number) => void = () => {};
let gameOver: (state: MatchState) => void = () => {};

// function that registers the UI handlers (replaces the no-op functions above with the actual handlers)
export function registerGameUiHandlers(handlers: {
	waitingForPlayers?: () => void;
	countdownToGame?: (n: number, side?: "left" | "right") => void;
	startGame?: () => void;
	tournamentMatchType?: (type: string, round: number) => void;
	gameOver?: (state: MatchState) => void;
}) {
	if (handlers.waitingForPlayers) waitingForPlayers = handlers.waitingForPlayers;
	if (handlers.countdownToGame) countdownToGame = handlers.countdownToGame;
	if (handlers.startGame) startGame = handlers.startGame;
	if (handlers.tournamentMatchType) tournamentMatchType = handlers.tournamentMatchType;
	if (handlers.gameOver) gameOver = handlers.gameOver;
}

export function connectToLocalSingleGameWS(state: MatchState): () => void {
	const wsUrl = `${WS_BASE}/local-single-game/${ROOM_ID}/ws`;
	console.log("URL: ", wsUrl);

	const ws = new WebSocket(wsUrl);
	userData.gameSock = ws;
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

				// notify UI once, when match just became "over"
				if (state.isOver && !wasOver) {
					console.log("[WS] Local game over, calling gameOver handler");
					gameOver(state);
				}

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

			default:
				console.warn("[WS] Unknown payload:", payload);
				break;
		}
	});

	ws.addEventListener("close", () => {
		setActiveSocket(null);
		resetRequested = false;
	});

	ws.addEventListener("error", () => ws.close());

	// <-- return cleanup function
	return () => ws.close();
}

export function connectToSingleGameWS(state: MatchState, roomId?: string): () => void {
	const targetRoomId = roomId ?? ROOM_ID;
	const wsUrl = `${WS_BASE}/single-game/${targetRoomId}/ws`;

	const ws = new WebSocket(wsUrl);
	userData.gameSock = ws;
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
				// server tells us which side we're playing on
				const data = (payload as any).data;
					userData.matchId = data?.matchId || null;
				console.log(`[WS] Assigned to match ${data?.matchId} as ${data?.playerSide}`);
				setAssignedSide(data?.playerSide || null);
				break;
			}

			case "state": {
				const wasOver = state.isOver;

				// payload.data is now MatchState
				applyBackendState(state, payload.data);

				// notify UI once, when match just became "over"
				if (state.isOver && !wasOver) {
					console.log("[WS] Online game over, calling gameOver handler");
					gameOver(state);
				}

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

			default:
				console.warn("[WS] Unknown payload:", payload);
				break;
		}
	});

	ws.addEventListener("close", () => {
		setActiveSocket(null);
		resetRequested = false;
	});

	ws.addEventListener("error", () => ws.close());

	// <-- return cleanup function
	return () => ws.close();
}

export function connectToTournamentWS(state: MatchState, roomId?: string, tournamentName?: string): () => void {
	const targetRoomId = roomId ?? ROOM_ID;
	// add tournament name as query parameter if provided
	const nameParam = tournamentName ? `?name=${encodeURIComponent(tournamentName)}` : "";
	const wsUrl = `${WS_BASE}/tournament/${targetRoomId}/ws${nameParam}`;

	const ws = new WebSocket(wsUrl);
	userData.gameSock = ws;
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
				// server tells us which side we're playing on
				const data = (payload as any).data;
				setAssignedSide(data?.playerSide || null);

				// notify UI about tournament match type
				if (data?.tournamentMatchType) {
					tournamentMatchType(data.tournamentMatchType, data.round || 1);
				}
				break;
			}

			case "state": {
				const wasOver = state.isOver;

				// payload.data is now MatchState
				applyBackendState(state, payload.data);

				// notify UI once, when match just became "over"
				if (state.isOver && !wasOver) {
					console.log("[WS] Tournament game over, calling gameOver handler");
					gameOver(state);
				}

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

			default:
				console.warn("[WS] Unknown payload:", payload);
				break;
		}
	});

	ws.addEventListener("close", () => {
		setActiveSocket(null);
		resetRequested = false;
	});

	ws.addEventListener("error", () => ws.close());

	// <-- return cleanup function
	return () => ws.close();
}
