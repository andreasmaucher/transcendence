import { COLOR_BACKGROUND, COLOR_CENTERLINE, COLOR_PADDLE_BALL_LIGHT, COLOR_SCORE, FONT_SCORE } from "../constants";
import { showSaveMatchPrompt } from "../wallet/prompt";
import { saveMatchOnChain } from "../wallet/contract";
import { getWalletState } from "../wallet/wallet";
import { ROOM_ID } from "../config/endpoints";
import { fetchMe } from "../api/http";
import { State } from "../game/state";

import { t } from "../i18n";
import { navigate } from "../router/router";

// Draw everything (reads state but does not change it, since there is no game logic here)
// function takes in a 2D canvas context ctx and the gurrent game State s
export function draw(ctx: CanvasRenderingContext2D, s: State): void {
	// wipes all previous pixels in the full canvas area
	ctx.clearRect(0, 0, s.width, s.height);
	ctx.fillStyle = COLOR_BACKGROUND;
	// paints the entire canvas area with the background color
	ctx.fillRect(0, 0, s.width, s.height);

	// this part draws the center line dividing the field in half
	ctx.strokeStyle = COLOR_CENTERLINE;
	ctx.setLineDash([6, 10]);
	ctx.beginPath();
	ctx.moveTo(s.width / 2, 0);
	ctx.lineTo(s.width / 2, s.height);
	ctx.stroke();
	ctx.setLineDash([]);

	// draws the two paddles as filled rectangles
	ctx.fillStyle = COLOR_PADDLE_BALL_LIGHT;
	ctx.fillRect(s.left.x, s.left.y, s.left.w, s.left.h); // left paddle
	ctx.fillRect(s.right.x, s.right.y, s.right.w, s.right.h); // right paddle

	// draws the ball as a circle
	ctx.beginPath();
	ctx.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2);
	ctx.fill();

	// draws the score text near the top
	ctx.fillStyle = COLOR_SCORE;
	ctx.font = FONT_SCORE;
	ctx.fillText(String(s.scoreL), s.width * 0.4, 32);
	ctx.fillText(String(s.scoreR), s.width * 0.6, 32);

	// show winner message if game is over
	if (s.isOver && s.winner) {
		ctx.fillStyle = "#fbbf24"; // bright yellow for winner text
		ctx.font = "32px system-ui";
		ctx.textAlign = "center";

		// translated winner text
		const winnerText = s.winner === "left"
			? t("gameOver.leftWins")
			: t("gameOver.rightWins");

		// Only show winner text for non-tournament matches
		if (s.mode !== "tournament") {
			ctx.fillText(winnerText, s.width / 2, s.height / 2);
		}

		// Only show refresh text for non-tournament matches
		if (s.mode !== "tournament") {
			ctx.fillText(t("gameOver.refresh"), s.width / 2, s.height / 2 + 40);
		}

		// Only show blockchain save prompt for non-tournament matches
		if (s.mode !== "tournament") {
			showSaveMatchPrompt(s, async ({ address, state: gameState }) => {
			// Build the payload for the smart contract.
			// NOTE: Contract address/ABI/function are placeholders in config/contract.ts
			// and should be updated when the real contract is provided.

			// Determine participants (usernames). We only know the currently-authenticated user here.
			const me = await fetchMe().catch(() => null);
			const currentUser = me?.username ?? "player";

			// Without backend metadata for sides/opponent, use placeholders that can be refined later.
			const playerLeft = "left:" + currentUser;
			const playerRight = "right:opponent"; // TODO: replace with real opponent username when available

			// Compute a gameId and index placeholders; update when backend/contract specify exact values.
			const now = Date.now();
			const gameId = `${ROOM_ID}-${now}`; // e.g., "tournament-123-1699999999999"
			const gameIndex = 0; // TODO: inject real index from tournament bracket

			const s2 = gameState as State;
			const params = {
				tournamentId: ROOM_ID,
				gameId,
				gameIndex,
				playerLeft,
				playerRight,
				scoreLeft: s2.scoreL,
				scoreRight: s2.scoreR,
			};

			const { provider } = getWalletState();
			if (!provider) throw new Error("Wallet not connected");
			const txHash = await saveMatchOnChain(provider, params);
			return {
				tournamentId: params.tournamentId,
				gameId: params.gameId,
				txHash,
			};
		});
		} // Close the "if (s.mode !== "tournament")" block
		ctx.textAlign = "left"; // reset text alignment
	}
}
