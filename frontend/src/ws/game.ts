import { userData } from "../config/constants";
import { ROOM_ID, WS_HOST, WS_PORT, WS_PROTOCOL } from "../config/endpoints";
import { flushInputs, queueInput, setActiveSocket, setAssignedSide } from "../game/input";
import { applyBackendState } from "../game/state";
import { MatchState } from "../types/game";
import { Payload } from "../types/ws_message";
import { navigate } from "../router/router";

import {
	handleTournamentMatchAssigned,
	handleTournamentMatchState,
	resetTournamentOrchestrator,
} from "../views/tournament/overlays/tournament_orchestrator";
import { setMatchActive } from "../config/matchState";

// no-op functions to avoid errors as long as the UI has not registered handlers by calling registerGameUiHandlers
let waitingForPlayers: () => void = () => {};
let countdownToGame: (n: number, side?: "left" | "right") => void = () => {};
let startGame: () => void = () => {};
let tournamentMatchType: (type: string, round: number) => void = () => {};
let showPlayerLeftMessage: (message: string) => Promise<void> = async () => {};

// function that registers the UI handlers (replaces the no-op functions above with the actual handlers)
export function registerGameUiHandlers(handlers: {
	waitingForPlayers?: () => void;
	countdownToGame?: (n: number, side?: "left" | "right") => void;
	startGame?: () => void;
	tournamentMatchType?: (type: string, round: number) => void;
	showPlayerLeftMessage?: (message: string) => Promise<void>;
}) {
	if (handlers.waitingForPlayers) waitingForPlayers = handlers.waitingForPlayers;
	if (handlers.countdownToGame) countdownToGame = handlers.countdownToGame;
	if (handlers.startGame) startGame = handlers.startGame;
	if (handlers.tournamentMatchType) tournamentMatchType = handlers.tournamentMatchType;
	if (handlers.showPlayerLeftMessage) showPlayerLeftMessage = handlers.showPlayerLeftMessage;
}

export function connectToLocalSingleGameWS(state: MatchState): () => void {
	const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/local-single-game/${ROOM_ID}/ws`;
	console.log("URL: ", wsUrl);

	const ws = new WebSocket(wsUrl);
	userData.gameSock = ws;
	setActiveSocket(ws);
	setAssignedSide(null); // Local game: control both paddles

	let resetRequested = false;
	let isHandlingForfeit = false; // Flag to prevent close handler from navigating during forfeit overlay

	ws.addEventListener("open", () => {
		queueInput("left", "stop");
		queueInput("right", "stop");
		flushInputs();
	});

	ws.addEventListener("message", async (event) => {
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

			case "player-left": {
				// Other player left - show overlay message then navigate
				isHandlingForfeit = true;
				await showPlayerLeftMessage("Your opponent forfeited the game.");
				navigate("#/menu");
				ws.close();
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

	ws.addEventListener("close", (event) => {
		setActiveSocket(null);
		resetRequested = false;
		// If socket closed unexpectedly (not by us) AND we're not handling forfeit, navigate to menu
		if (!isHandlingForfeit && (event.code !== 1000 || event.reason)) {
			console.log("[WS] Connection closed:", event.reason);
			setMatchActive(false); // Show topbar again before navigating
			navigate("#/menu");
		}
		//setTimeout(() => connectToLocalSingleGameWS(state), 1000);
	});

	ws.addEventListener("error", () => ws.close());

	// <-- return cleanup function
	return () => ws.close();
}

export function connectToSingleGameWS(state: MatchState, roomId?: string): () => void {
	const targetRoomId = roomId ?? ROOM_ID;
	const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/single-game/${targetRoomId}/ws`;

	const ws = new WebSocket(wsUrl);
	userData.gameSock = ws;
	setActiveSocket(ws);

	let resetRequested = false;
	let isHandlingForfeit = false;

	ws.addEventListener("open", () => {
		queueInput("left", "stop");
		queueInput("right", "stop");
		flushInputs();
	});

	ws.addEventListener("message", async (event) => {
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

			case "player-left": {
				// Other player left - show overlay message then navigate
				isHandlingForfeit = true;
				setMatchActive(false); // Show topbar again before showing overlay
				await showPlayerLeftMessage("Your opponent forfeited the game.");
				navigate("#/menu");
				ws.close();
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

	ws.addEventListener("close", (event) => {
		setActiveSocket(null);
		resetRequested = false;
		// If socket closed unexpectedly (not by us) AND we're not handling forfeit, navigate to menu
		if (!isHandlingForfeit && (event.code !== 1000 || event.reason)) {
			console.log("[WS] Connection closed:", event.reason);
			setMatchActive(false); // Show topbar again before navigating
			navigate("#/menu");
		}
		//setTimeout(() => connectToSingleGameWS(state), 1000);
	});

	ws.addEventListener("error", () => ws.close());

	// <-- return cleanup function
	return () => ws.close();
}

export function connectToTournamentWS(
	state: MatchState,
	roomId?: string,
	tournamentName?: string,
	displayName?: string
): () => void {
	const targetRoomId = roomId ?? ROOM_ID;
	// ANDY: add tournament name and display name as query parameters if provided
	const queryParams = new URLSearchParams();
	if (tournamentName) {
		queryParams.set("name", tournamentName);
	}
	if (displayName) {
		queryParams.set("displayName", displayName);
	}
	const queryString = queryParams.toString();
	const nameParam = queryString ? `?${queryString}` : "";
	const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/tournament/${targetRoomId}/ws${nameParam}`;

	const ws = new WebSocket(wsUrl);
	userData.gameSock = ws;
	setActiveSocket(ws);

	let resetRequested = false;
	let isHandlingForfeit = false;
	// ANDY: store match info (players) for each match we see
	const matchPlayersMap = new Map<string, { left: string | null; right: string | null }>();

	ws.addEventListener("open", () => {
		resetTournamentOrchestrator();
		queueInput("left", "stop");
		queueInput("right", "stop");
		flushInputs();
	});

	ws.addEventListener("message", async (event) => {
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

				// ANDY: only update assignedSide if playerSide is explicitly set meaning the player is in the match
				// This prevents overwriting the correct side when receiving match-assigned for for matches the player is not in
				// the backend sends playerSide:null for matches the player is not in and we need it to show the tournament bracket correctly
				// but it will not change the paddle they control
				if (data?.playerSide !== null && data?.playerSide !== undefined) {
					setAssignedSide(data.playerSide);
				}

				// ANDY: store match players so we can determine winner later
				if (data?.matchId) {
					matchPlayersMap.set(data.matchId, {
						left: data?.leftPlayer?.username || null,
						right: data?.rightPlayer?.username || null,
					});
				}

				handleTournamentMatchAssigned(data);

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

				// ANDY: when a match finishes, call handleTournamentMatchState
				// Find which match this state belongs to by checking all known matches (because we don't have matchid here)
				if (state.isOver && state.winner && !wasOver) {
					for (const [matchId, players] of matchPlayersMap.entries()) {
						const winnerUsername = state.winner === "left" ? players.left : players.right;
						if (winnerUsername) {
							handleTournamentMatchState(state, matchId, players.left, players.right);
							break;
						}
					}
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

			case "player-left": {
				// Other player left - show overlay message then navigate
				isHandlingForfeit = true;
				setMatchActive(false); // Show topbar again before showing overlay
				await showPlayerLeftMessage("Your opponent forfeited the game.");
				navigate("#/menu");
				ws.close();
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

	ws.addEventListener("close", (event) => {
		setActiveSocket(null);
		resetRequested = false;
		// If socket closed unexpectedly (not by us) AND we're not handling forfeit, navigate to menu
		if (!isHandlingForfeit && (event.code !== 1000 || event.reason)) {
			console.log("[WS] Connection closed:", event.reason);
			setMatchActive(false); // Show topbar again before navigating
			navigate("#/menu");
		}
		//setTimeout(() => connectToTournamentWS(state), 1000);
	});

	ws.addEventListener("error", () => ws.close());

	// <-- return cleanup function
	return () => ws.close();
}
