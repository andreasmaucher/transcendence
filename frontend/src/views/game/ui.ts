// src/views/game/ui.ts
import { type GameConstants } from "../../constants";
import { navigate } from "../../router/router";
import { fetchGameConstants, fetchMe } from "../../api/http";
import { draw } from "../../rendering/canvas";
import { setupInputs, setActiveSocket } from "../../game/input";
import { MatchState } from "../../types/game";
import { userData } from "../../config/constants";
import {
	connectToLocalSingleGameWS,
	connectToSingleGameWS,
	connectToTournamentWS,
	registerGameUiHandlers,
} from "../../ws/game";
import { showCountdown } from "../game/countdown";
import { showMessageOverlay } from "./forfeit_overlay";
import { t } from "../../i18n";
import { createTournamentOverlay } from "../../views/tournament/overlays/tournament_overlay";
import { hideTournamentOverlay } from "../../views/tournament/overlays/tournament_overlay";
import { setMatchActive } from "../../config/matchState";

let GAME_CONSTANTS: GameConstants | null = null;

// -------------------------------
// Existing logic (unchanged)
// -------------------------------
function createInitialState(): MatchState {
	if (!GAME_CONSTANTS) throw new Error("Game constants not loaded");
	const centerY = (GAME_CONSTANTS.fieldHeight - GAME_CONSTANTS.paddleHeight) / 2;

	const left = {
		x: GAME_CONSTANTS.paddleMargin,
		y: centerY,
		w: GAME_CONSTANTS.paddleWidth,
		h: GAME_CONSTANTS.paddleHeight,
		speed: GAME_CONSTANTS.paddleSpeed,
	};

	const right = {
		x: GAME_CONSTANTS.fieldWidth - GAME_CONSTANTS.paddleMargin - GAME_CONSTANTS.paddleWidth,
		y: centerY,
		w: GAME_CONSTANTS.paddleWidth,
		h: GAME_CONSTANTS.paddleHeight,
		speed: GAME_CONSTANTS.paddleSpeed,
	};

	return {
		isRunning: true,
		width: GAME_CONSTANTS.fieldWidth,
		height: GAME_CONSTANTS.fieldHeight,
		left,
		right,
		ball: {
			x: GAME_CONSTANTS.fieldWidth / 2,
			y: GAME_CONSTANTS.fieldHeight / 2,
			vx: 0,
			vy: 0,
			r: GAME_CONSTANTS.ballRadius,
		},
		scoreL: 0,
		scoreR: 0,
		isOver: false,
		winner: null,
		winningScore: GAME_CONSTANTS.winningScore,
		tick: 0,
	};
}

function startGameLoop(canvas: HTMLCanvasElement, state: MatchState): () => void {
	const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

	let running = true;

	function frame() {
		if (!running) return;
		draw(ctx, state);
		requestAnimationFrame(frame);
	}

	requestAnimationFrame(frame);

	return () => {
		running = false;
	};
}

export async function renderGame(container: HTMLElement) {
	container.innerHTML = "";
	let cancelled = false;

	// NEW: minimal variable to ensure countdown fires ONCE
	let onlineCountdownStarted = false;
	let onlineCountdownPromise: Promise<void> | null = null;
	let cancelCountdown: (() => void) | null = null;

	const hash = location.hash;
	const queryStr = hash.split("?")[1] || "";
	const params = new URLSearchParams(queryStr);
	const modeParam = params.get("mode");
	const mode: "tournament" | "online" | "local" =
		modeParam === "tournament" || modeParam === "online" || modeParam === "local" ? modeParam : "local";
	const roomId = params.get("id") || undefined;
	const tournamentName = params.get("name") || undefined;
	const displayName = params.get("displayName") || undefined;

	console.log("GAME MODE =", mode, "ROOM ID =", roomId, "TOURNAMENT NAME =", tournamentName);

	// ==========================================================
	// GAME FRAME WRAPPER
	// ==========================================================
	const wrapper = document.createElement("div");
	wrapper.style.position = "relative";
	wrapper.style.width = "fit-content";
	wrapper.style.margin = "80px auto 0 auto";

	wrapper.style.padding = "14px";
	wrapper.style.borderRadius = "12px";
	wrapper.style.background = "rgba(10, 10, 10, 0.45)";

	wrapper.style.border = "2px solid rgba(255, 44, 251, 0.25)";
	wrapper.style.boxShadow = `
		0 0 10px rgba(255, 44, 251, 0.18),
		0 0 26px rgba(255, 44, 251, 0.12),
		inset 0 0 12px rgba(255, 44, 251, 0.15)
	`;

	container.append(wrapper);
	createTournamentOverlay(container);

	// Floating UI (top-right)
	const ui = document.createElement("div");
	ui.style.position = "absolute";
	ui.style.top = "-60px";
	ui.style.left = "50%";
	ui.style.transform = "translateX(-50%)";

	ui.style.display = "flex";
	ui.style.flexDirection = "column";
	ui.style.gap = "8px";
	ui.style.zIndex = "9999";
	wrapper.append(ui);

	// USER INFO
	const userBox = document.createElement("div");
	userBox.style.display = "flex";
	userBox.style.alignItems = "center";
	userBox.style.gap = "8px";
	userBox.style.background = "rgba(0,0,0,0.5)";
	userBox.style.padding = "4px 8px";
	userBox.style.borderRadius = "6px";
	userBox.style.color = "#fff";
	userBox.style.border = "1px solid rgba(221, 238, 33, 0.71)";
	userBox.style.boxShadow = "0 0 10px rgba(251, 255, 44, 0.4)";
	userBox.style.backdropFilter = "blur(6px)";

	ui.append(userBox);

	(async () => {
		const me = await fetchMe();
		if (!me) return;

		const avatar = document.createElement("img");
		avatar.src = me.avatar || "/default-avatar.png";
		avatar.width = 36;
		avatar.height = 36;
		avatar.style.borderRadius = "50%";
		avatar.style.objectFit = "cover";

		const name = document.createElement("span");
		name.textContent = me.username;
		name.style.color = "#e4cc2fff"; // blue
		name.style.fontWeight = "600";

		userBox.append(avatar, name);
	})();

	// SIDE INDICATOR
	const sideIndicator = document.createElement("div");
	sideIndicator.style.display = "none";
	sideIndicator.style.background = "rgba(0,0,0,0.5)";
	sideIndicator.style.padding = "4px 8px";
	sideIndicator.style.borderRadius = "6px";
	sideIndicator.style.color = "#9ad1ff";
	sideIndicator.style.fontSize = "14px";
	sideIndicator.style.textAlign = "center";
	sideIndicator.style.fontWeight = "bold";

	if (mode !== "local") {
		import("../../game/input.js").then(({ onSideAssigned }) => {
			onSideAssigned((side) => {
				if (side === "left") {
					ui.style.left = "10px";
					ui.style.right = "";
					ui.style.transform = "none";
					userBox.style.flexDirection = "row";
				} else {
					ui.style.right = "10px";
					ui.style.left = "";
					ui.style.transform = "none";
					userBox.style.flexDirection = "row-reverse";
				}

				sideIndicator.textContent =
					side === "left" ? "You control: LEFT paddle (W/S)" : "You control: RIGHT paddle (↑/↓)";

				sideIndicator.style.display = "block";
			});
		});
	}

	// TOURNAMENT INDICATOR
	const tournamentIndicator = document.createElement("div");
	tournamentIndicator.style.display = "none";
	tournamentIndicator.style.background = "rgba(255,215,0,0.9)";
	tournamentIndicator.style.padding = "8px 12px";
	tournamentIndicator.style.borderRadius = "6px";
	tournamentIndicator.style.color = "#000";
	tournamentIndicator.style.fontSize = "16px";
	tournamentIndicator.style.textAlign = "center";
	tournamentIndicator.style.fontWeight = "bold";
	ui.append(tournamentIndicator);

	let isWaiting = mode !== "local"; // Track if we're in waiting mode
	const exitBtn = document.createElement("button");

	// Function to update button text based on state
	const updateButtonText = () => {
		exitBtn.textContent = isWaiting ? t("game.leave") : t("game.exit");

		// attach to wrapper (same as user info)
		wrapper.append(exitBtn);

		wrapper.append(sideIndicator);

		sideIndicator.style.position = "absolute";
		sideIndicator.style.bottom = "-34px";
		sideIndicator.style.left = "50%";
		sideIndicator.style.transform = "translateX(-50%)";
	};
	updateButtonText(); // Set initial text

	exitBtn.style.position = "absolute";
	exitBtn.style.top = "-60px";
	exitBtn.style.left = "50%";
	exitBtn.style.transform = "translateX(-50%)";

	// keep it above tournament overlay
	exitBtn.style.zIndex = "10001";

	exitBtn.style.padding = "8px 16px";
	exitBtn.style.fontSize = "16px";
	exitBtn.style.fontWeight = "bold";
	exitBtn.style.color = "#ff6bff";
	exitBtn.style.background = "rgba(10,10,10,0.6)";
	exitBtn.style.border = "2px solid #ff2cfb";
	exitBtn.style.borderRadius = "6px";
	exitBtn.style.backdropFilter = "blur(5px)";
	exitBtn.style.cursor = "pointer";

	exitBtn.style.transition = "background-color 0.25s ease, box-shadow 0.25s ease, transform 0.12s ease";

	exitBtn.onmouseenter = () => {
		exitBtn.style.backgroundColor = "rgba(255,44,251,0.15)";
		exitBtn.style.boxShadow = "0 0 14px #ff6bff, 0 0 22px #ff2cfb66";
	};

	exitBtn.onmouseleave = () => {
		exitBtn.style.backgroundColor = "rgba(10,10,10,0.6)";
		exitBtn.style.boxShadow = "none";
	};

	exitBtn.onclick = async () => {
		cancelled = true;
		setMatchActive(false); // Show topbar again before navigating
		if (cancelCountdown) cancelCountdown(); // Stop countdown immediately

		if (isWaiting) {
			// In waiting mode: go back to appropriate lobby
			userData.gameSock?.close(); // Close socket

			// Navigate to the lobby based on game mode
			if (mode === "online") {
				navigate("#/online");
			} else if (mode === "tournament") {
				navigate("#/tournament");
			} else {
				// Local game: go to menu (no lobby for local)
				navigate("#/menu");
			}
		} else {
			// In playing mode: show forfeit overlay, then go back to lobby
			const overlayPromise = showMessageOverlay("You forfeited the game.");
			userData.gameSock?.close(); // Close socket (triggers backend forfeit)
			await overlayPromise; // Wait for overlay to complete

			// Navigate to the lobby based on game mode
			if (mode === "online") {
				navigate("#/online");
			} else if (mode === "tournament") {
				navigate("#/tournament");
			} else {
				// Local game: go to menu (no lobby for local)
				navigate("#/menu");
			}
		}
	};

	wrapper.append(exitBtn);

	//
	// Fetch game constants
	//
	GAME_CONSTANTS = await fetchGameConstants();
	if (cancelled) return;

	//
	// Canvas
	//
	const canvas = document.createElement("canvas");
	canvas.width = GAME_CONSTANTS.fieldWidth;
	canvas.height = GAME_CONSTANTS.fieldHeight;
	wrapper.append(canvas);

	// preview
	const previewState = createInitialState();
	const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
	draw(ctx, previewState);

	//
	// Local game countdown
	//
	if (mode === "local") {
		setMatchActive(true); // Hide topbar navigation during match
		const countdown = showCountdown(wrapper, canvas);
		cancelCountdown = countdown.cancel;
		await countdown.promise;
		cancelCountdown = null;
		if (cancelled) return;
	}

	//
	// Create game state
	//
	const state = createInitialState();
	state.mode = mode;

	//
	// WAITING OVERLAY
	//
	const waitingOverlay = document.createElement("div");
	waitingOverlay.style.position = "absolute";
	waitingOverlay.style.top = "0";
	waitingOverlay.style.left = "0";
	waitingOverlay.style.width = "100%";
	waitingOverlay.style.height = "100%";
	waitingOverlay.style.background = "rgba(0,0,0,0.8)";
	waitingOverlay.style.display = mode === "local" ? "none" : "flex";
	waitingOverlay.style.alignItems = "center";
	waitingOverlay.style.justifyContent = "center";
	waitingOverlay.style.color = "white";
	waitingOverlay.style.fontSize = "24px";
	waitingOverlay.style.zIndex = "1000";
	waitingOverlay.textContent = "Waiting for opponent...";
	wrapper.append(waitingOverlay);

	//
	// WS UI HANDLERS — MINIMAL CHANGE ONLY
	//
	registerGameUiHandlers({
		waitingForPlayers: () => {
			if (cancelled) return;
			if (mode !== "local") {
				waitingOverlay.textContent = "Waiting for opponent...";
				waitingOverlay.style.display = "flex";
				isWaiting = true; // Update waiting state
				updateButtonText(); // Update button to "Leave"
			}
		},

		//
		// FIX: Replace text countdown with real animation
		//
		countdownToGame: (n, _side) => {
			if (cancelled) return;

			if (mode !== "local" && n > 0 && !onlineCountdownStarted) {
				onlineCountdownStarted = true;

				// hide overlay BEFORE countdown starts
				hideTournamentOverlay();

				setMatchActive(true); // Hide topbar navigation during match
				waitingOverlay.style.display = "none";
				isWaiting = false; // No longer waiting, game is starting
				updateButtonText(); // Update button to "Forfeit Match"
				const countdown = showCountdown(wrapper, canvas);
				cancelCountdown = countdown.cancel;
				onlineCountdownPromise = countdown.promise;
			}
		},

		//
		// FIX: Start only after animation fully completes
		//
		startGame: () => {
			if (cancelled) return;

			// HIDE TOURNAMENT OVERLAY WHEN GAME STARTS
			hideTournamentOverlay();

			if (onlineCountdownPromise) {
				onlineCountdownPromise.then(() => {
					cancelCountdown = null;
					if (cancelled) return;
					waitingOverlay.style.display = "none";
					isWaiting = false; // Game has started
					updateButtonText(); // Update button to "Forfeit Match"
				});
			} else {
				waitingOverlay.style.display = "none";
				isWaiting = false; // Game has started
				updateButtonText(); // Update button to "Forfeit Match"
			}
		},

		showPlayerLeftMessage: async (message: string) => {
			// Cancel countdown if it's running (so the countdown overlay is not running in the background)
			if (cancelCountdown) {
				cancelCountdown();
				cancelCountdown = null;
			}
			setMatchActive(false); // Show topbar again
			await showMessageOverlay(message);
		},
	});

	const cleanupWS =
		mode === "local"
			? connectToLocalSingleGameWS(state)
			: mode === "online"
			? connectToSingleGameWS(state, roomId)
			: connectToTournamentWS(state, roomId, tournamentName, displayName);

	setupInputs();
	const cleanupLoop = startGameLoop(canvas, state);

	return () => {
		cancelled = true;
		setMatchActive(false); // Show topbar again when leaving game view
		cleanupLoop();
		cleanupWS();
		setActiveSocket(null);
	};
}
