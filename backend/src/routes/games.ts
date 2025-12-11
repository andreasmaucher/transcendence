import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getOpenSingleGames } from "../managers/singleGameManager.js";
import { getOpenTournaments } from "../managers/tournamentManagerHelpers.js";
import { getTournamentsByUserDB } from "../database/tournaments/getters.js";
import { getAllSGMatchesByUserDB } from "../database/matches/getters.js";

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
		// Sanitize: remove non-serializable fields like 'clients' (Set<WebSocket>) before returning to avoid JSON.stringify errors
		data.openSingleGames = openSingleGames.map((g) => ({
			id: g.id,
			name: g.name,
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
		data.openTournaments = openTournaments.map((t) => ({
			id: t.id,
			name: t.name,
			state: t.state,
			players: t.players.map((p) => ({
				username: p.username,
				displayName: p.displayName,
			})),
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

	// GET all games where a specific user played
	fastify.get("/api/games/of/:username", async (request: FastifyRequest, reply: FastifyReply) => {
		const { username } = request.params as { username: string };
		try {
			const singleGames = getAllSGMatchesByUserDB(username);
			const tournaments = getTournamentsByUserDB(username);
			const data: any = {
				singleGames: singleGames,
				tournaments: tournaments,
			};
			return reply.code(200).send({ success: true, data });
		} catch (error: any) {
			console.error("[gamesRT]", error.message);
			return reply.code(500).send({ success: false, message: "Unable to retrieve games" });
		}
	});
}
