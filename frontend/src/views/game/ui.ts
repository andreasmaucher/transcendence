// src/views/game/ui.ts
import { type GameConstants } from "../../constants";
import { navigate } from "../../router/router";
import { fetchGameConstants } from "../../api/http";
import { draw } from "../../rendering/canvas";
import { setupInputs, setActiveSocket } from "../../game/input";
import { MatchState } from "../../types/game";
import {
	connectToLocalSingleGameWS,
	connectToSingleGameWS,
	connectToTournamentWS,
	registerGameUiHandlers,
} from "../../ws/game";
import { userData } from "../../config/constants";
import { showCountdown } from "../game/countdown";

let GAME_CONSTANTS: GameConstants | null = null;

// -------------------------------
// Existing logic (unchanged)
// -------------------------------
function createInitialState(): MatchState {
	if (!GAME_CONSTANTS) throw new Error("Game constants not loaded");
	const centerY =
		(GAME_CONSTANTS.fieldHeight - GAME_CONSTANTS.paddleHeight) / 2;

	const left = {
		x: GAME_CONSTANTS.paddleMargin,
		y: centerY,
		w: GAME_CONSTANTS.paddleWidth,
		h: GAME_CONSTANTS.paddleHeight,
		speed: GAME_CONSTANTS.paddleSpeed,
	};

	const right = {
		x:
			GAME_CONSTANTS.fieldWidth -
			GAME_CONSTANTS.paddleMargin -
			GAME_CONSTANTS.paddleWidth,
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

function startGameLoop(
	canvas: HTMLCanvasElement,
	state: MatchState
): () => void {
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
	const mode: "tournament" | "online" | "local" =
		hash.includes("mode=tournament")
			? "tournament"
			: hash.includes("mode=online")
			? "online"
			: "local";

	console.log("GAME MODE =", mode);

	// ==========================================================
	// GAME FRAME WRAPPER WITH BORDER INLINE
	// ==========================================================
	const wrapper = document.createElement("div");
	wrapper.style.position = "relative";
	wrapper.style.width = "fit-content";
	wrapper.style.margin = "80px auto 0 auto";

	// BORDER + GLOW MATCHING MENU STYLE
	wrapper.style.padding = "14px";
	wrapper.style.borderRadius = "12px";
	wrapper.style.background = "rgba(10, 10, 10, 0.45)";
	wrapper.style.backdropFilter = "blur(6px)";

	wrapper.style.border = "2px solid rgba(255, 44, 251, 0.25)";
	wrapper.style.boxShadow = `
		0 0 10px rgba(255, 44, 251, 0.18),
		0 0 26px rgba(255, 44, 251, 0.12),
		inset 0 0 12px rgba(255, 44, 251, 0.15)
	`;

	container.append(wrapper);

	// ==========================================================
	// CLEAN EXIT BUTTON
	// ==========================================================
	const exitBtn = document.createElement("button");
	exitBtn.textContent = "Exit";
	exitBtn.style.position = "absolute";
	exitBtn.style.top = "-60px";
	exitBtn.style.right = "0";

	exitBtn.style.padding = "8px 16px";
	exitBtn.style.fontSize = "16px";
	exitBtn.style.fontWeight = "bold";

	exitBtn.style.color = "#ff6bff";
	exitBtn.style.background = "rgba(10,10,10,0.6)";
	exitBtn.style.border = "2px solid #ff2cfb";
	exitBtn.style.borderRadius = "6px";
	exitBtn.style.backdropFilter = "blur(5px)";
	exitBtn.style.cursor = "pointer";

	exitBtn.style.transition =
		"background-color 0.25s ease, box-shadow 0.25s ease, transform 0.12s ease";

	exitBtn.onmouseenter = () => {
		exitBtn.style.backgroundColor = "rgba(255,44,251,0.15)";
		exitBtn.style.boxShadow =
			"0 0 14px #ff6bff, 0 0 22px #ff2cfb66";
	};

	exitBtn.onmouseleave = () => {
		exitBtn.style.backgroundColor = "rgba(10,10,10,0.6)";
		exitBtn.style.boxShadow = "none";
	};

	exitBtn.onclick = () => {
		navigate("#/menu");
		userData.gameSock?.close();
	};

	wrapper.append(exitBtn);

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

	// preview before countdown
	const previewState = createInitialState();
	const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
	draw(ctx, previewState);

	// countdown
	if (mode === "local") {
		await showCountdown(wrapper, canvas);
	}

	//
	// 3) Start game
	//
	const state = createInitialState();

	registerGameUiHandlers({
		waitingForPlayers: () => {},
		countdownToGame: () => {},
		startGame: () => {},
	});

	const cleanupWS =
		mode === "local"
			? connectToLocalSingleGameWS(state)
			: mode === "online"
			? connectToSingleGameWS(state)
			: connectToTournamentWS(state);

	setupInputs();
	const cleanupLoop = startGameLoop(canvas, state);

	// cleanup
	return () => {
		cancelled = true;
		cleanupLoop();
		cleanupWS();
		setActiveSocket(null);
	};
}
