import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAllTournamentsDB, getTournamentByIdDB } from "../database/tournaments/getters.js";
import { getOpenTournaments, getTournament, isTournamentOpen } from "../managers/tournamentManagerHelpers.js";
import { Tournament } from "../types/game.js";

export default async function tournamentRoutes(fastify: FastifyInstance) {
	// ROUTES FOR MULTIPLE TOURNAMENTS
	// GET all tournaments in the database
	fastify.get("/api/tournaments/all", async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			const tournaments = getAllTournamentsDB();
			return reply.code(200).send({ success: true, data: tournaments });
		} catch (error: any) {
			console.error("[tournamentRT]", error.message);
			return reply.code(500).send({ success: false, message: "Unable to retrieve tournaments" });
		}
	});

	// GET all open tournaments
	fastify.get("/api/tournaments/open", async (_request: FastifyRequest, reply: FastifyReply) => {
		const openTournaments: Tournament[] = getOpenTournaments();
		if (openTournaments.length === 0) {
			console.error("[tournamentRT] No open tournaments");
			return reply.code(404).send({ success: false, message: "No open tournaments" });
		} else {
			// ANDY: sanitize tournaments before returning (strip WS clients / non-serializable fields so JSON.stringify succeeds)
			// this is needed for the tournament list in the frontend
			// if we would return them as it is API throws "ciruclar structure" error and the frontend can't render it
			const data = openTournaments.map((t) => ({
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
			return reply.code(200).send({ success: true, data });
		}
	});

	// ROUTES FOR ONE TOURNAMENT ONLY
	// GET a tournament by id
	fastify.get("/api/tournament/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		const { id } = request.params as { id: string };

		try {
			const tournament = getTournamentByIdDB(id);
			return reply.code(200).send({ success: true, data: tournament });
		} catch (error: any) {
			console.error("[tournamentRT]", error.message);
			return reply.code(404).send({ success: false, message: "Tournament not found" });
		}
	});
	// CHECK if tournament is open
	fastify.get("/api/tournament/is-open/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		const { id } = request.params as { id: string };
		try {
			const tournament = getTournament(id);
			if (!tournament) return reply.code(200).send({ success: true, open: false });
			const open = isTournamentOpen(tournament);
			return reply.code(200).send({ success: true, open: open });
		} catch (error: any) {
			console.error("[tournamentRT]", error.message);
			return reply.code(400).send({ success: false, message: "Unable to check the tournament" });
		}
	});
}
