// src/views/game/ui.ts
import { type GameConstants } from "../../constants";
import { navigate } from "../../router/router";
import { fetchGameConstants, fetchMe } from "../../api/http";
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
import { SNOWTRACE_TX_BASE } from "../../config/contract";

type ChainResult = { ok: true; txHash: string } | { ok: false; error: string };
type RemoteChainResult =
	| {
			ok: true;
			txHash: string;
			playerLeft: string;
			playerRight: string;
			scoreLeft: number;
			scoreRight: number;
			winner: string;
	  }
	| { ok: false; error: string };

let GAME_CONSTANTS: GameConstants | null = null;

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

async function reportLocalGameToBlockchain(params: {
	player1: string;
	player2: string;
	winner: string;
	mode: string;
	score1: number;
	score2: number;
}): Promise<ChainResult> {
	console.log("[BLOCKCHAIN] Sending local game to backend /api/blockchain/local-game", params);
	try {
		const res = await fetch("/api/blockchain/local-game", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify(params),
		});

		const body = await res.json().catch(() => null);

		if (!res.ok || !body?.success) {
			console.error("[BLOCKCHAIN] Failed to write local game", res.status, body);
			const message = body?.message || body?.error || "Game stats could not be stored on the blockchain.";
			return { ok: false, error: message };
		}

		const txHash: string | undefined = body.data?.txHash;
		if (!txHash) {
			console.warn("[BLOCKCHAIN] Response success=true but missing txHash", body);
			return {
				ok: false,
				error: "Game stats may be stored on-chain, but no transaction hash was returned.",
			};
		}

		console.log("[BLOCKCHAIN] Local game stored on-chain. Tx:", txHash);
		return { ok: true, txHash };
	} catch (err) {
		console.error("[BLOCKCHAIN] Error calling /api/blockchain/local-game", err);
		return {
			ok: false,
			error: "Network or server error while storing game stats on the blockchain.",
		};
	}
}

async function reportRemoteGameToBlockchain(matchId: string): Promise<RemoteChainResult> {
	console.log("[BLOCKCHAIN] Sending remote game to backend /api/blockchain/remote-game", { matchId });
	try {
		const res = await fetch("/api/blockchain/remote-game", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ matchId }),
		});

		const body = await res.json().catch(() => null);
		if (!res.ok || !body?.success) {
			console.error("[BLOCKCHAIN] Failed to write remote game", res.status, body);
			const message = body?.message || body?.error || "Game stats could not be stored on the blockchain.";
			return { ok: false, error: message };
		}

		const txHash: string | undefined = body.data?.txHash;
		if (!txHash) {
			console.warn("[BLOCKCHAIN] Remote response success=true but missing txHash", body);
			return {
				ok: false,
				error: "Game stats may be stored on-chain, but no transaction hash was returned.",
			};
		}

		return {
			ok: true,
			txHash,
			playerLeft: body.data?.playerLeft,
			playerRight: body.data?.playerRight,
			scoreLeft: body.data?.scoreLeft,
			scoreRight: body.data?.scoreRight,
			winner: body.data?.winner,
		};
	} catch (err) {
		console.error("[BLOCKCHAIN] Error calling /api/blockchain/remote-game", err);
		return {
			ok: false,
			error: "Network or server error while storing game stats on the blockchain.",
		};
	}
}

export async function renderGame(container: HTMLElement) {
	container.innerHTML = "";
	let cancelled = false;

	const hash = location.hash;
	const queryStr = hash.split("?")[1] || "";
	const params = new URLSearchParams(queryStr);
	const modeParam = params.get("mode");
	// properly extracting mode and room id from the URL
	const mode: "tournament" | "online" | "local" =
		modeParam === "tournament" || modeParam === "online" || modeParam === "local" ? modeParam : "local";
	const roomId = params.get("id") || undefined;
	const tournamentName = params.get("name") || undefined;

	console.log("GAME MODE =", mode, "ROOM ID =", roomId, "TOURNAMENT NAME =", tournamentName);

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

	// TOURNAMENT MATCH TYPE INDICATOR (final/3rd place)
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

	// Register callback to update side indicator when player is assigned
	if (mode !== "local") {
		import("../../game/input.js").then(({ onSideAssigned }) => {
			onSideAssigned((side) => {
				sideIndicator.textContent =
					side === "left" ? "You control: LEFT paddle (W/S)" : "You control: RIGHT paddle (↑/↓)";
				sideIndicator.style.display = "block";
			});
		});
	}

	//
	// EXIT BUTTON
	//
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

	exitBtn.style.transition = "background-color 0.25s ease, box-shadow 0.25s ease, transform 0.12s ease";

	exitBtn.onmouseenter = () => {
		exitBtn.style.backgroundColor = "rgba(255,44,251,0.15)";
		exitBtn.style.boxShadow = "0 0 14px #ff6bff, 0 0 22px #ff2cfb66";
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
	state.mode = mode;

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

	// overlay to show blockchain save result after game over (local only)
	const chainOverlay = document.createElement("div");
	chainOverlay.style.position = "absolute";
	chainOverlay.style.top = "0";
	chainOverlay.style.left = "0";
	chainOverlay.style.width = "100%";
	chainOverlay.style.height = "100%";
	chainOverlay.style.display = "none";
	chainOverlay.style.alignItems = "center";
	chainOverlay.style.justifyContent = "center";
	chainOverlay.style.background = "rgba(0, 0, 0, 0.78)";
	chainOverlay.style.zIndex = "1100";

	const chainCard = document.createElement("div");
	chainCard.style.minWidth = "360px";
	chainCard.style.maxWidth = "520px";
	chainCard.style.padding = "20px 24px";
	chainCard.style.borderRadius = "10px";
	chainCard.style.background = "linear-gradient(135deg, rgba(12,12,30,0.96), rgba(32,10,40,0.96))";
	chainCard.style.border = "1px solid rgba(255,44,251,0.4)";
	chainCard.style.boxShadow = "0 0 16px rgba(255,44,251,0.4), 0 0 32px rgba(140,120,255,0.35)";
	chainCard.style.color = "#fdfdff";
	chainCard.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
	chainOverlay.append(chainCard);
	wrapper.append(chainOverlay);

	const showChainLoading = (options: {
		leftScore: number;
		rightScore: number;
		player1: string;
		player2: string;
		winner: string;
		modeLabel: string;
	}) => {
		chainCard.innerHTML = "";

		const title = document.createElement("h2");
		title.style.margin = "0 0 8px 0";
		title.style.fontSize = "20px";
		title.style.fontWeight = "700";
		title.style.letterSpacing = "0.04em";
		title.textContent = "Saving match to the blockchain";
		title.style.color = "#9ad4ff";

		const summary = document.createElement("p");
		summary.style.margin = "0 0 10px 0";
		summary.style.fontSize = "14px";
		summary.style.opacity = "0.9";
		summary.textContent =
			"Please wait while your game stats are being written to the smart contract.";

		const scoreLine = document.createElement("p");
		scoreLine.style.margin = "0 0 12px 0";
		scoreLine.style.fontSize = "15px";
		scoreLine.style.fontWeight = "500";

		const winnerLabel =
			options.winner === "Draw"
				? "Game ended in a draw."
				: `Winner: ${options.winner} (${options.leftScore}:${options.rightScore})`;
		scoreLine.textContent = winnerLabel;

		const meta = document.createElement("div");
		meta.style.marginBottom = "14px";
		meta.style.fontSize = "13px";
		meta.style.opacity = "0.9";
		meta.innerHTML = `
			<div><strong>Player 1:</strong> ${options.player1}</div>
			<div><strong>Player 2:</strong> ${options.player2}</div>
			<div><strong>Final score:</strong> ${options.leftScore} - ${options.rightScore}</div>
			<div><strong>Mode:</strong> ${options.modeLabel}</div>
		`;

		const loadingLine = document.createElement("div");
		loadingLine.style.marginTop = "8px";
		loadingLine.style.fontSize = "13px";
		loadingLine.style.opacity = "0.85";
		loadingLine.textContent = "Submitting transaction to the blockchain...";

		const buttonsRow = document.createElement("div");
		buttonsRow.style.display = "flex";
		buttonsRow.style.justifyContent = "flex-end";
		buttonsRow.style.gap = "8px";

		const backBtn = document.createElement("button");
		backBtn.textContent = "Back to menu";
		backBtn.style.padding = "6px 14px";
		backBtn.style.borderRadius = "6px";
		backBtn.style.border = "1px solid rgba(255,255,255,0.35)";
		backBtn.style.background = "rgba(15,15,30,0.9)";
		backBtn.style.color = "#fdfdff";
		backBtn.style.cursor = "pointer";
		backBtn.onclick = () => {
			navigate("#/menu");
		};

		buttonsRow.append(backBtn);

		chainCard.append(title, summary, scoreLine, meta, loadingLine, buttonsRow);
		chainOverlay.style.display = "flex";
	};

	const showChainResult = (
		result: ChainResult,
		options: {
			leftScore: number;
			rightScore: number;
			player1: string;
			player2: string;
			winner: string;
			modeLabel: string;
		}
	) => {
		chainCard.innerHTML = "";

		const title = document.createElement("h2");
		title.style.margin = "0 0 8px 0";
		title.style.fontSize = "20px";
		title.style.fontWeight = "700";
		title.style.letterSpacing = "0.04em";

		const summary = document.createElement("p");
		summary.style.margin = "0 0 10px 0";
		summary.style.fontSize = "14px";
		summary.style.opacity = "0.9";

		const scoreLine = document.createElement("p");
		scoreLine.style.margin = "0 0 12px 0";
		scoreLine.style.fontSize = "15px";
		scoreLine.style.fontWeight = "500";

		const meta = document.createElement("div");
		meta.style.marginBottom = "14px";
		meta.style.fontSize = "13px";
		meta.style.opacity = "0.9";

		const dataBlock = document.createElement("div");
		dataBlock.style.marginBottom = "8px";
		dataBlock.innerHTML = `
			<div><strong>Player 1:</strong> ${options.player1}</div>
			<div><strong>Player 2:</strong> ${options.player2}</div>
			<div><strong>Final score:</strong> ${options.leftScore} - ${options.rightScore}</div>
			<div><strong>Winner:</strong> ${options.winner}</div>
			<div><strong>Mode:</strong> ${options.modeLabel}</div>
		`;
		meta.append(dataBlock);

		const winnerLabel =
			options.winner === "Draw"
				? "Game ended in a draw."
				: `Winner: ${options.winner} (${options.leftScore}:${options.rightScore})`;
		scoreLine.textContent = winnerLabel;

		if (result.ok) {
			title.textContent = "Match saved to the blockchain";
			title.style.color = "#7dffb2";
			summary.textContent = "Your game stats have been written to the smart contract.";

			const hashLine = document.createElement("div");
			hashLine.style.marginBottom = "8px";
			hashLine.textContent = `Tx hash: ${result.txHash}`;
			meta.append(hashLine);

			if (SNOWTRACE_TX_BASE) {
				const link = document.createElement("a");
				link.href = `${SNOWTRACE_TX_BASE.replace(/\/+$/, "")}/${result.txHash}`;
				link.target = "_blank";
				link.rel = "noreferrer";
				link.style.color = "#9ad4ff";
				link.style.textDecoration = "none";
				link.style.fontWeight = "500";
				link.textContent = "View on Snowtrace";
				meta.append(link);
			}
		} else {
			title.textContent = "Could not store stats on the blockchain";
			title.style.color = "#ff9a9a";
			summary.textContent = result.error || "Your game finished normally, but the blockchain write failed.";
		}

		const buttonsRow = document.createElement("div");
		buttonsRow.style.display = "flex";
		buttonsRow.style.justifyContent = "flex-end";
		buttonsRow.style.gap = "8px";

		const backBtn = document.createElement("button");
		backBtn.textContent = "Back to menu";
		backBtn.style.padding = "6px 14px";
		backBtn.style.borderRadius = "6px";
		backBtn.style.border = "1px solid rgba(255,255,255,0.35)";
		backBtn.style.background = "rgba(15,15,30,0.9)";
		backBtn.style.color = "#fdfdff";
		backBtn.style.cursor = "pointer";
		backBtn.onclick = () => {
			navigate("#/menu");
		};

		buttonsRow.append(backBtn);

		chainCard.append(title, summary, scoreLine, meta, buttonsRow);
		chainOverlay.style.display = "flex";
	};

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

		// game over handler – trigger blockchain write and show overlay for local + online games
		gameOver: (finalState: MatchState) => {
			if (mode === "tournament") return;

			const leftScore = finalState.scoreL;
			const rightScore = finalState.scoreR;

			const player1 = userData.username || (userData as any).displayName || "Player";
			const player2 = mode === "local" ? "LocalOpponent" : "Opponent";

			const winner = leftScore > rightScore ? player1 : rightScore > leftScore ? player2 : "Draw";

			console.log("[BLOCKCHAIN] gameOver handler in UI", {
				leftScore,
				rightScore,
				player1,
				player2,
				winner,
			});

			// Always show an overlay so the player knows the outcome.
			if (winner === "Draw") {
				console.log("[BLOCKCHAIN] Local game ended in draw – not writing to chain");
				showChainResult(
					{
						ok: false,
						error: "Game ended in a draw – stats are not stored on the blockchain.",
					},
					{ leftScore, rightScore, player1, player2, winner, modeLabel: mode === "local" ? "local single-player" : "online multiplayer" }
				);
				return;
			}

			void (async () => {
				// Show immediate loading state while the backend persists stats and
				// publishes the transaction, then update the popup with the result.
				showChainLoading({
					leftScore,
					rightScore,
					player1,
					player2,
					winner,
					modeLabel: mode === "local" ? "local single-player" : "online multiplayer",
				});

				if (mode === "local") {
					const result = await reportLocalGameToBlockchain({
						player1,
						player2,
						winner,
						mode: "local",
						score1: leftScore,
						score2: rightScore,
					});
					showChainResult(result, {
						leftScore,
						rightScore,
						player1,
						player2,
						winner,
						modeLabel: "local single-player",
					});
					return;
				}

				const matchId = userData.matchId;
				if (!matchId) {
					showChainResult(
						{ ok: false, error: "Missing match id; could not store stats on the blockchain." },
						{
							leftScore,
							rightScore,
							player1,
							player2,
							winner,
							modeLabel: "online multiplayer",
						}
					);
					return;
				}

				const remote = await reportRemoteGameToBlockchain(matchId);
				if (!remote.ok) {
					showChainResult(
						{ ok: false, error: remote.error },
						{
							leftScore,
							rightScore,
							player1,
							player2,
							winner,
							modeLabel: "online multiplayer",
						}
					);
					return;
				}

				showChainResult(
					{ ok: true, txHash: remote.txHash },
					{
						leftScore: remote.scoreLeft,
						rightScore: remote.scoreRight,
						player1: remote.playerLeft,
						player2: remote.playerRight,
						winner: remote.winner,
						modeLabel: "online multiplayer",
					}
				);
			})();
		},
	});

	const cleanupWS =
		mode === "local"
			? connectToLocalSingleGameWS(state)
			: mode === "online"
			? connectToSingleGameWS(state, roomId)
			: connectToTournamentWS(state, roomId, tournamentName);
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
