import { ROOM_ID, WS_HOST, WS_PORT, WS_PROTOCOL } from "../config/endpoints";
import { flushInputs, queueInput, setActiveSocket } from "../game/input";
import { applyBackendState } from "../game/state";
import { MatchState } from "../types/game";
import { Payload } from "../types/ws_message";

// --- UI HANDLER REGISTRY (optional hooks the view can register) ---
// These functions are called when the backend notifies about lifecycle events.
// Defaults are no-ops so nothing breaks if the UI hasn't registered handlers yet.
let onWaiting: () => void = () => {};
let onCountdown: (n: number, side?: "left" | "right") => void = () => {};
let onStart: () => void = () => {};

// Call this once from the game view to register UI reactions.
// Example:
// registerGameUiHandlers({
//   onWaiting: () => showWaitingOverlay(),
//   onCountdown: (n, side) => showCountdownOverlay(n, side),
//   onStart: () => hideOverlay(),
// });
export function registerGameUiHandlers(handlers: {
	onWaiting?: () => void;
	onCountdown?: (n: number, side?: "left" | "right") => void;
	onStart?: () => void;
}) {
	if (handlers.onWaiting) onWaiting = handlers.onWaiting;
	if (handlers.onCountdown) onCountdown = handlers.onCountdown;
	if (handlers.onStart) onStart = handlers.onStart;
}

export function connectToLocalSingleGameWS(state: MatchState): () => void {
	const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/local-single-game/${ROOM_ID}/ws`;

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

			case "waiting": {
				// notify UI that we are waiting for other player(s)
				onWaiting();
				break;
			}

			case "countdown": {
				// backend sends countdown value (e.g., 3,2,1) and optionally the player's side
				const n = (payload as any).data?.value as number | undefined;
				const side = (payload as any).data?.side as "left" | "right" | undefined;
				onCountdown(n ?? 0, side);
				break;
			}

			case "start": {
				// notify UI to hide overlays and let gameplay proceed
				onStart();
				break;
			}

			default:
				// ignore unknown payloads to keep client resilient
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

			// backend says: not all players connected yet
			// -> inform the UI (e.g., show a waiting overlay)
			case "waiting": {
				onWaiting();
				break;
			}

			// backend sends a countdown tick (3,2,1) and may include the player's side
			// -> pass the number and side to the UI (e.g., show "3" and "you are left/right")
			case "countdown": {
				const n = (payload as any).data?.value as number | undefined; // current countdown number
				const side = (payload as any).data?.side as "left" | "right" | undefined; // player's side if provided
				onCountdown(n ?? 0, side);
				break;
			}

			// backend says: start gameplay
			// -> UI should hide overlays; normal state frames will keep arriving
			case "start": {
				onStart();
				break;
			}

			default:
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

			case "waiting": {
				onWaiting();
				break;
			}

			case "countdown": {
				const n = (payload as any).data?.value as number | undefined;
				const side = (payload as any).data?.side as "left" | "right" | undefined;
				onCountdown(n ?? 0, side);
				break;
			}

			case "start": {
				onStart();
				break;
			}

			default:
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
