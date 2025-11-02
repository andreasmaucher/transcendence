import { FastifyInstance } from "fastify";
import { getTournamentById } from "../database/helpers/tournament_getters.js";

export default async function tournamentRoutes(fastify: FastifyInstance) {

	fastify.get("/api/tournaments/:id", async (request, reply) => {
		const { id } = request.params as { id: string };
    

		try {
			const tournament = getTournamentById(id);
			return reply.code(200).send({ success: true, data: tournament });
		} catch (error : any) {
			console.log(error.message);
			return reply.code(404).send({ success: false, message: "Tournament not found" });
		}
	});
}
