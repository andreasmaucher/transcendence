import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getOpenSingleGames } from "../managers/singleGameManager.js";
import { getOpenTournaments } from "../managers/tournamentManagerHelpers.js";
import { saveMatchOnChain } from "../config/blockchain.js";

// ROUTES FOR GAMES (SINGLE OR TOURNAMENTS)
export default async function gamesRoutes(fastify: FastifyInstance) {
	// GET all open games
	fastify.get("/api/games/open", async (_request: FastifyRequest, reply: FastifyReply) => {
		const openGames = {
			singleGames: getOpenSingleGames(),
			tournaments: getOpenTournaments(),
		};
		if (openGames.singleGames.length === 0 && openGames.tournaments.length === 0) {
			console.error("[gamesRT] No open games");
			return reply.code(404).send({ success: false, message: "No open games" });
		} else {
			return reply.code(200).send({ success: true, data: openGames });
		}
	});

	// POST: game finished → write to chain (and optionally DB)
	fastify.post("/api/game/finish", async (request: FastifyRequest, reply: FastifyReply) => {
		const body = request.body as {
			player1: string;
			player2: string;
			winner: string;
			mode: string;
			score1: number;
			score2: number;
		};

		// 1. Optionally save to DB
		// const match = await saveMatchToDB(body);

		// 2. Write on-chain (fire-and-forget).
		// Use mode as a coarse tournamentId hint and generate a
		// per-game unique gameId from players + timestamp so that
		// repeated games are stored under distinct keys.
		const nowTs = BigInt(Date.now());
		const tournamentId = body.mode || "generic";
		const gameId = `${body.player1}-${body.player2}-${Date.now().toString()}`;

		saveMatchOnChain({
			tournamentId,
			gameId,
			gameIndex: nowTs,
			playerLeft: body.player1,
			playerRight: body.player2,
			scoreLeft: body.score1,
			scoreRight: body.score2,
		}).catch((err) => {
			request.log.error({ err }, "Failed to save match on-chain");
		});

		// If you have a DB row, return that instead of body
		return reply.send({ success: true, data: body });
	});
}
