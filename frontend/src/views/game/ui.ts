// src/views/game/ui.ts
import { type GameConstants } from "../../constants";
import { navigate } from "../../router/router";
import { fetchGameConstants } from "../../api/http";
import { draw } from "../../rendering/canvas";
import { setupInputs, setActiveSocket } from "../../game/input";
import { MatchState } from "../../types/game";
import { connectToLocalSingleGameWS, connectToSingleGameWS, registerGameUiHandlers } from "../../ws/game";

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
	const mode = hash.includes("mode=online") ? "online" : "local";
	console.log("GAME MODE =", mode);

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
	// register UI handlers for WS events
	registerGameUiHandlers({
		onWaiting: () => {
			// placeholder: show "Waiting..." overlay here
		},
		onCountdown: (_n, _side) => {
			// placeholder: show "3,2,1"
		},
		onStart: () => {
			// placeholder: hide overlays here I assume? or just start the game?
		},
	});

	// choose the correct WS connector based on mode
	const cleanupWS =
		mode === "local"
			? connectToLocalSingleGameWS(state)
			: connectToSingleGameWS(state);
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
