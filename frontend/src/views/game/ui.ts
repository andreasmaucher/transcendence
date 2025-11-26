// src/views/game/ui.ts
import { type GameConstants } from "../../constants";
import { navigate } from "../../router/router";
import { fetchGameConstants, fetchMe } from "../../api/http";
import { draw } from "../../rendering/canvas";
import { setupInputs, setActiveSocket } from "../../game/input";
import { MatchState } from "../../types/game";
import { connectToLocalSingleGameWS, connectToSingleGameWS, connectToTournamentWS, registerGameUiHandlers } from "../../ws/game";

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
	const hash = location.hash;
	const queryStr = hash.split("?")[1] || "";
	const params = new URLSearchParams(queryStr);
	const modeParam = params.get("mode");
	//! LOGIC properly extracting mode and room id from the URL
	const mode: "tournament" | "online" | "local" =
		modeParam === "tournament" || modeParam === "online" || modeParam === "local"
			? modeParam
			: "local";
	const roomId = params.get("id") || undefined;
	const tournamentName = params.get("name") || undefined;

	console.log("GAME MODE =", mode, "ROOM ID =", roomId, "TOURNAMENT NAME =", tournamentName);

	// UI WRAPPER
	const wrapper = document.createElement("div");
	wrapper.style.position = "relative";
	wrapper.style.width = "fit-content";
	wrapper.style.margin = "0 auto";
	container.append(wrapper);

	// Floating UI (top-right)
	const ui = document.createElement("div");
	ui.style.position = "absolute";
	ui.style.top = "-150px";
	ui.style.right = "10px";
	ui.style.display = "flex";
	ui.style.flexDirection = "column";
	ui.style.gap = "8px";
	ui.style.zIndex = "9999";
	wrapper.append(ui);

	// USER INFO (avatar + name)
	const userBox = document.createElement("div");
	userBox.style.display = "flex";
	userBox.style.alignItems = "center";
	userBox.style.gap = "8px";
	userBox.style.background = "rgba(0,0,0,0.5)";
	userBox.style.padding = "4px 8px";
	userBox.style.borderRadius = "6px";
	userBox.style.color = "#fff";
	ui.append(userBox);

	(async () => {
		const me = await fetchMe();
		if (!me) return;

		const avatar = document.createElement("img");
		avatar.src = me.avatar || "/default-avatar.png";
		avatar.width = 32;
		avatar.height = 32;
		avatar.style.borderRadius = "50%";
		avatar.style.objectFit = "cover";

		const name = document.createElement("span");
		name.textContent = me.username;

		userBox.append(avatar, name);
	})();

	//! LOGIC
	// PLAYER SIDE INDICATOR (for online/tournament modes)
	const sideIndicator = document.createElement("div");
	sideIndicator.style.display = "none"; // Hidden by default
	sideIndicator.style.background = "rgba(0,0,0,0.5)";
	sideIndicator.style.padding = "4px 8px";
	sideIndicator.style.borderRadius = "6px";
	sideIndicator.style.color = "#fff";
	sideIndicator.style.fontSize = "14px";
	sideIndicator.style.textAlign = "center";
	sideIndicator.style.fontWeight = "bold";
	ui.append(sideIndicator);

	// Register callback to update side indicator when player is assigned
	if (mode !== "local") {
		import("../../game/input.js").then(({ onSideAssigned }) => {
			onSideAssigned((side) => {
				sideIndicator.textContent = side === "left" ? "You control: LEFT paddle (W/S)" : "You control: RIGHT paddle (↑/↓)";
				sideIndicator.style.display = "block";
			});
		});
	}

	//
	// EXIT BUTTON
	//
	const exitBtn = document.createElement("button");
	exitBtn.textContent = "Exit Game";
	exitBtn.style.padding = "4px 8px";
	exitBtn.style.fontSize = "14px";
	exitBtn.style.cursor = "pointer";
	exitBtn.onclick = () => navigate("#/menu");
	ui.append(exitBtn);

	//
	// MUTE BUTTON
	//
	//   let muted = false;
	//   const audio = new Audio("/assets/game-music.mp3");
	//   audio.loop = true;
	//   audio.volume = 0.4;
	//   audio.play().catch(() => { /* autoplay block ignored */ });

	//   const muteBtn = document.createElement("button");
	//   muteBtn.textContent = "Mute";
	//   muteBtn.style.padding = "4px 8px";
	//   muteBtn.style.fontSize = "14px";
	//   muteBtn.style.cursor = "pointer";

	//   muteBtn.onclick = () => {
	//     muted = !muted;
	//     audio.muted = muted;
	//     muteBtn.textContent = muted ? "Unmute" : "Mute";
	//   };

	//   ui.append(muteBtn);

	//
	// 1) Fetch game constants
	//
	GAME_CONSTANTS = await fetchGameConstants();
	if (cancelled) return;

	//
	// 2) Create canvas
	//
	const canvas = document.createElement("canvas");
	canvas.width = GAME_CONSTANTS.fieldWidth;
	canvas.height = GAME_CONSTANTS.fieldHeight;
	wrapper.append(canvas);

	//
	// 3) Start game
	//
	const state = createInitialState();
	
	//! LOGIC waiting overlay for online and tournament modes
	// create waiting overlay (only shown for online/tournament modes)
	const waitingOverlay = document.createElement("div");
	waitingOverlay.style.position = "absolute";
	waitingOverlay.style.top = "0";
	waitingOverlay.style.left = "0";
	waitingOverlay.style.width = "100%";
	waitingOverlay.style.height = "100%";
	waitingOverlay.style.background = "rgba(0,0,0,0.8)";
	waitingOverlay.style.display = mode === "local" ? "none" : "flex"; // Hide for local games
	waitingOverlay.style.alignItems = "center";
	waitingOverlay.style.justifyContent = "center";
	waitingOverlay.style.color = "white";
	waitingOverlay.style.fontSize = "24px";
	waitingOverlay.style.zIndex = "1000";
	waitingOverlay.textContent = "Waiting for opponent...";
	wrapper.append(waitingOverlay);

	// register UI handlers for WS events
	registerGameUiHandlers({
		waitingForPlayers: () => {
			// Only show for online/tournament games
			if (mode !== "local") {
				waitingOverlay.textContent = "Waiting for opponent...";
				waitingOverlay.style.display = "flex";
			}
		},
		countdownToGame: (n, _side) => {
			// Only show countdown for online/tournament games
			if (mode !== "local" && n > 0) {
				waitingOverlay.textContent = `Starting in ${n}...`;
				waitingOverlay.style.display = "flex";
			}
		},
		startGame: () => {
			waitingOverlay.style.display = "none";
		},
	});

	// choose the correct WS connector based on mode
	const cleanupWS =
		mode === "local"
			? connectToLocalSingleGameWS(state)
			: mode === "online"
			? connectToSingleGameWS(state, roomId)
			: connectToTournamentWS(state, roomId, tournamentName);
	setupInputs();

	const cleanupLoop = startGameLoop(canvas, state);

	//
	// Return cleanup for router
	//
	return () => {
		cancelled = true;
		cleanupLoop();
		cleanupWS();
		setActiveSocket(null);
		//   audio.pause();
		//    audio.src = "";
	};
}
