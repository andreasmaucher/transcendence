import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { SingleGame } from "../types/game.js";
import { getOpenSingleGames } from "../managers/singleGameManager.js";

export default async function singleGameRoutes(fastify: FastifyInstance) {
	// ROUTES FOR MULTIPLE SINGLE GAMES
	// GET all open single games
	fastify.get("/api/single-games/open", async (_request: FastifyRequest, reply: FastifyReply) => {
		const openSingleGames: SingleGame[] = getOpenSingleGames();
		if (openSingleGames.length == 0) {
			console.log("No open single games");
			return reply.code(404).send({ success: false, message: "No open single games" });
		} else {
			return reply.code(200).send({ success: true, data: openSingleGames });
		}
	});

	// ROUTES FOR ONE SINGLE GAME ONLY
}
