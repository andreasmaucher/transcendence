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

		// 2. Write on-chain (fire-and-forget)
		const nowTs = BigInt(Date.now());

		saveMatchOnChain({
			player1: body.player1,
			player2: body.player2,
			timestamp: nowTs,
			mode: body.mode,
			winner: body.winner,
			score1: body.score1,
			score2: body.score2,
		}).catch((err) => {
			request.log.error({ err }, "Failed to save match on-chain");
		});

		// If you have a DB row, return that instead of body
		return reply.send({ success: true, data: body });
	});
}
