import { FastifyInstance } from "fastify";
import { getTournamentById } from "../database/helpers/tournament_getters.js";

export default async function matchRoutes(fastify: FastifyInstance) {

	fastify.get("/api/tournaments/:id", async (request, reply) => {
		const { id } = request.params as { id: string };

		const tournament = getTournamentById(id);
		if (!tournament) return reply.code(404).send({ success: false, message: "Tournament not found" });

		return reply.code(200).send({ success: true, data: tournament });
	});
}
