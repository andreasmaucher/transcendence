import { FastifyInstance } from "fastify";
import { getAllTournamentsDB, getTournamentByIdDB } from "../database/tournaments/getters.js";
import { getOpenTournaments } from "../managers/tournamentManagerHelpers.js";
import { Tournament } from "../types/game.js";

export default async function tournamentRoutes(fastify: FastifyInstance) {
	// ROUTES FOR MULTIPLE TOURNAMENTS
	// GET all tournaments in the database
	fastify.get("/api/tournaments/all", async (_request, reply) => {
		try {
			const tournaments = getAllTournamentsDB();
			return reply.code(200).send({ success: true, data: tournaments });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(500).send({ success: false, message: "Unable to retrieve tournaments" });
		}
	});

	// GET all open tournaments
	fastify.get("/api/tournaments/open", async (_request, reply) => {
		const openTournaments: Tournament[] = getOpenTournaments();
		if (openTournaments.length == 0) {
			console.log("No open tournaments");
			return reply.code(404).send({ success: false, message: "No open tournaments" });
		} else {
			return reply.code(200).send({ success: true, data: openTournaments });
		}
	});

	// ROUTES FOR ONE TOURNAMENT ONLY
	// GET a tournament by id
	fastify.get("/api/tournament/:id", async (request, reply) => {
		const { id } = request.params as { id: string };

		try {
			const tournament = getTournamentByIdDB(id);
			return reply.code(200).send({ success: true, data: tournament });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(404).send({ success: false, message: "Tournament not found" });
		}
	});
}
