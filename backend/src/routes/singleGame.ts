import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { SingleGame } from "../types/game.js";
import { getOpenSingleGames, getSingleGame, isSingleGameOpen } from "../managers/singleGameManager.js";

export default async function singleGameRoutes(fastify: FastifyInstance) {
	// ROUTES FOR MULTIPLE SINGLE GAMES
	// GET all open single games
	fastify.get("/api/single-games/open", async (_request: FastifyRequest, reply: FastifyReply) => {
		const openSingleGames: SingleGame[] = getOpenSingleGames();
		if (openSingleGames.length == 0) console.log("No open single games");
		// Sanitize: remove non-serializable fields like 'clients' (Set<WebSocket>) before returning to avoid JSON.stringify errors
		const data = openSingleGames.map((g) => ({
			id: g.id,
			mode: g.mode,
			match: {
				id: g.match.id,
				isRunning: g.match.state.isRunning,
				isOver: g.match.state.isOver,
				players: { left: g.match.players.left?.username, right: g.match.players.right?.username },
				mode: g.match.mode,
			},
			playersJoined: (() => {
				let count = 0;
				if (g.match.players.left) count++;
				if (g.match.players.right) count++;
				return count;
			})(),
		}));
		return reply.code(200).send({ success: true, data });
	});

	// ROUTES FOR ONE SINGLE GAME ONLY
	// CHECK if single game is open
	fastify.get("/api/single-game/is-open/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		const { id } = request.params as { id: string };
		try {
			const singleGame = getSingleGame(id);
			if (!singleGame) return reply.code(200).send({ success: true, open: false });
			const open = isSingleGameOpen(singleGame);
			return reply.code(200).send({ success: true, open: open });
		} catch (error: any) {
			console.error("[singleGameRT]", error.message);
			return reply.code(400).send({ success: false, message: "Unable to check the single game" });
		}
	});
}
