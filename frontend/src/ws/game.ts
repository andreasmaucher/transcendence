// Store blockchain tx status for tournament (legacy - single status)
let blockchainTxStatus: { status: "pending"|"success"|"fail", txHash?: string } | null = null;

// Store per-match blockchain tx status for tournament matches
const matchTxStatusMap = new Map<string, { status: "pending"|"success"|"fail", txHash?: string }>();

// Export function to get match tx status for overlay display
export function getMatchTxStatus(matchId: string): { status: "pending"|"success"|"fail", txHash?: string } | undefined {
	return matchTxStatusMap.get(matchId);
}

// Export function to clear match tx status (called when resetting tournament orchestrator)
export function clearMatchTxStatusMap() {
	matchTxStatusMap.clear();
}
import { userData } from "../config/constants";
import * as endpoints from "../config/endpoints";
import { flushInputs, queueInput, setActiveSocket, setAssignedSide } from "../game/input";
import { applyBackendState } from "../game/state";
import { MatchState } from "../types/game";
import { Payload } from "../types/ws_message";
import { navigate } from "../router/router";

import {
	handleTournamentMatchAssigned,
	handleTournamentMatchState,
	resetTournamentOrchestrator,
	isMatchInRound2,
	getMatchType,
} from "../views/tournament/overlays/tournament_orchestrator";
import { setMatchActive } from "../config/matchState";

const { ROOM_ID, WS_HOST, WS_PORT, WS_PROTOCOL } = endpoints;

// no-op functions to avoid errors as long as the UI has not registered handlers by calling registerGameUiHandlers
let waitingForPlayers: () => void = () => {};
let countdownToGame: (n: number, side?: "left" | "right") => void = () => {};
let startGame: () => void = () => {};
let tournamentMatchType: (type: string, round: number) => void = () => {};
let showPlayerLeftMessage: (message: string) => Promise<void> = async () => {};
let onMatchOver: () => void = () => {};

// function that registers the UI handlers (replaces the no-op functions above with the actual handlers)
export function registerGameUiHandlers(handlers: {
	waitingForPlayers?: () => void;
	countdownToGame?: (n: number, side?: "left" | "right") => void;
	startGame?: () => void;
	tournamentMatchType?: (type: string, round: number) => void;
	showPlayerLeftMessage?: (message: string) => Promise<void>;
	onMatchOver?: () => void;
}) {
	if (handlers.waitingForPlayers) waitingForPlayers = handlers.waitingForPlayers;
	if (handlers.countdownToGame) countdownToGame = handlers.countdownToGame;
	if (handlers.startGame) startGame = handlers.startGame;
	if (handlers.tournamentMatchType) tournamentMatchType = handlers.tournamentMatchType;
	if (handlers.showPlayerLeftMessage) showPlayerLeftMessage = handlers.showPlayerLeftMessage;
	if (handlers.onMatchOver) onMatchOver = handlers.onMatchOver;
}

export function connectToLocalSingleGameWS(state: MatchState): () => void {
	const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/local-single-game/${ROOM_ID}/ws`;

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
		matchTxStatusMap.clear(); // Clear per-match tx status on new tournament connection
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

		// Listen for blockchain tx status
		if (payload.type === "blockchain-tx-status") {
			blockchainTxStatus = payload.data;
			if (blockchainTxStatus) {
				showBlockchainTxStatus(blockchainTxStatus);
			}
			return;
		}

		// Listen for per-match blockchain tx status
		if (payload.type === "match-tx-status") {
			const data = payload.data as { matchId: string; status: "pending"|"success"|"fail"; txHash?: string };
			if (data?.matchId) {
				matchTxStatusMap.set(data.matchId, { status: data.status, txHash: data.txHash });
				// Trigger overlay update by dispatching a custom event
				window.dispatchEvent(new CustomEvent("match-tx-status-update", { detail: data }));
			}
			return;
		}
// Show blockchain tx status in overlay
function showBlockchainTxStatus(statusObj: { status: "pending"|"success"|"fail", txHash?: string }) {
	let el = document.getElementById("blockchain-tx-status");
	if (!el) {
		el = document.createElement("div");
		el.id = "blockchain-tx-status";
		el.style.cssText = "margin:16px 0;padding:12px;border-radius:8px;font-family:monospace;font-size:15px;text-align:center;";
		const overlay = document.querySelector(".tournament-overlay-content");
		if (overlay) overlay.appendChild(el);
	}
	if (statusObj.status === "pending") {
		el.textContent = "Saving winning match to blockchain... (pending)";
		el.style.background = "#fffbe6";
		el.style.color = "#b59f00";
	} else if (statusObj.status === "success") {
		el.innerHTML = `Saved to blockchain! Tx: <a href='https://testnet.snowtrace.io/tx/${statusObj.txHash}' target='_blank' rel='noopener'>${statusObj.txHash}</a>`;
		el.style.background = "#e6fff2";
		el.style.color = "#008c4a";
	} else if (statusObj.status === "fail") {
		el.textContent = "Blockchain save failed: " + (statusObj.txHash || "unknown error");
		el.style.background = "#ffe6e6";
		el.style.color = "#b00020";
	}
}

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
					// ANDY: First collect all matches where the winner matches, prioritizing round 2 matches
					let foundMatchId: string | null = null;
					let foundRound2MatchId: string | null = null;

					// ANDY: Collect ALL matches where the winner matches (both Round 1 and Round 2)
					// We need to process ALL matches that finished, not just one
					//const allMatchingMatches: Array<{ matchId: string; players: { left: string | null; right: string | null }; isRound2: boolean }> = [];

					for (const [matchId, players] of matchPlayersMap.entries()) {
						const winnerUsername = state.winner === "left" ? players.left : players.right;
						if (winnerUsername) {
							const isRound2 = isMatchInRound2(matchId);

							if (isRound2) {
								// Found a round 2 match - this takes priority
								foundRound2MatchId = matchId;
							} else if (!foundMatchId) {
								// Store first round 1 match found (fallback)
								foundMatchId = matchId;
							}
						}
					}

					// Use round 2 match if found, otherwise use round 1 match
					const targetMatchId = foundRound2MatchId || foundMatchId;
					if (targetMatchId) {
						const players = matchPlayersMap.get(targetMatchId);
						if (players) {
							handleTournamentMatchState(state, targetMatchId, players.left, players.right);
							// ANDY: change button to "Back to Menu" only when a round 2 match (final or 3rd place) is over
							if (foundRound2MatchId) {
								onMatchOver();
							}
							/*allMatchingMatches.push({ matchId, players, isRound2 });
						}
					}
					
					// ANDY: Process all matching matches, but prioritize:
					// 1. Round 2 matches over Round 1
					// 2. Final matches over 3rd place matches
					allMatchingMatches.sort((a, b) => {
						// Round 2 matches first
						if (a.isRound2 && !b.isRound2) return -1;
						if (!a.isRound2 && b.isRound2) return 1;
						
						// If both are Round 2, prioritize final over 3rd place
						if (a.isRound2 && b.isRound2) {
							const aType = getMatchType(a.matchId);
							const bType = getMatchType(b.matchId);
							if (aType === "final" && bType !== "final") return -1;
							if (aType !== "final" && bType === "final") return 1;
						}
						
						return 0;
					});
					
					// ANDY: Only process the FIRST (prioritized) matching match
					// The state message is for ONE specific match, so we should only process one
					// Priority: Round 2 Final > Round 2 3rd Place > Round 1
					if (allMatchingMatches.length > 0) {
						const { matchId, players, isRound2 } = allMatchingMatches[0];
						handleTournamentMatchState(state, matchId, players.left, players.right);
						
						if (isRound2) {
							onMatchOver();*/
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
			setMatchActive(false); // Show topbar again before navigating
			navigate("#/menu");
		}
		//setTimeout(() => connectToTournamentWS(state), 1000);
	});

	ws.addEventListener("error", () => ws.close());

	// <-- return cleanup function
	return () => ws.close();
}
