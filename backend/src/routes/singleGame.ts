import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { SingleGame } from "../types/game.js";
import { getOpenSingleGames } from "../managers/singleGameManager.js";

export default async function singleGameRoutes(fastify: FastifyInstance) {
	// ROUTES FOR MULTIPLE SINGLE GAMES
	// GET all open single games
	fastify.get("/api/single-games/open", async (_request: FastifyRequest, reply: FastifyReply) => {
		const openSingleGames: SingleGame[] = getOpenSingleGames();
<<<<<<< HEAD
		if (openSingleGames.length === 0) {
			console.error("[singleGameRT] No open single games");
			return reply.code(404).send({ success: false, message: "No open single games" });
=======
		if (openSingleGames.length == 0) {
			console.log("No open single games");
>>>>>>> tournament_logic
		} else {
			// Sanitize: remove non-serializable fields like 'clients' (Set<WebSocket>) before returning to avoid JSON.stringify errors
			const data = openSingleGames.map((g) => ({
				id: g.id,
				mode: g.mode,
				creator: g.creator,
				gameNumber: g.gameNumber,
				match: {
					id: g.match.id,
					state: g.match.state,
					players: g.match.players,
					mode: g.match.mode,
				},
			}));
			return reply.code(200).send({ success: true, data });
		}
	});

	// ROUTES FOR ONE SINGLE GAME ONLY
}
