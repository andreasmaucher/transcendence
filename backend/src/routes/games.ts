import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getOpenSingleGames } from "../managers/singleGameManager.js";
import { getOpenTournaments } from "../managers/tournamentManagerHelpers.js";

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
}
