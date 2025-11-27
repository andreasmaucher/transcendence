import { FastifyInstance } from "fastify";
import { SingleGame } from "../types/game.js";
import { getOpenSingleGames } from "../managers/singleGameManager.js";

export default async function singleGameRoutes(fastify: FastifyInstance) {
	// ROUTES FOR MULTIPLE SINGLE GAMES
	// GET all open single games
	fastify.get("/api/single-games/open", async (_request, reply) => {
		const openSingleGames: SingleGame[] = getOpenSingleGames();
		if (openSingleGames.length == 0) {
			console.log("No open single games");
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
