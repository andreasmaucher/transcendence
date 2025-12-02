import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getOpenSingleGames } from "../managers/singleGameManager.js";
import { getOpenTournaments } from "../managers/tournamentManagerHelpers.js";

// ROUTES FOR GAMES (SINGLE OR TOURNAMENTS)
export default async function gamesRoutes(fastify: FastifyInstance) {
	// GET all open games
	fastify.get("/api/games/open", async (_request: FastifyRequest, reply: FastifyReply) => {
		const openSingleGames = getOpenSingleGames();
		const openTournaments = getOpenTournaments();
		const data: any = {
			openSingleGames: [],
			openTournaments: [],
		};
		data.openSingleGames = openSingleGames.map((g) => ({
			id: g.id,
			mode: g.mode,
			match: {
				id: g.match.id,
				state: g.match.state,
				players: g.match.players,
				mode: g.match.mode,
			},
		}));
		data.openTournaments = openTournaments.map((t) => ({
			id: t.id,
			name: t.name,
			state: t.state,
			// count players in first round matches to show in the lobby player x of 4 have joined already
			playersJoined: (() => {
				const round1Matches = t.matches.get(1);
				if (!round1Matches) return 0;
				let count = 0;
				for (const match of round1Matches) {
					if (match.players.left) count++;
					if (match.players.right) count++;
				}
				return count;
			})(),
		}));
		return reply.code(200).send({ success: true, data: data });
	});
}
