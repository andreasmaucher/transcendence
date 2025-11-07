import { FastifyInstance } from "fastify";
import { getMatchById } from "../database/matches/getters.js";

export default async function matchRoutes(fastify: FastifyInstance) {
	fastify.get("/api/match/:id", async (request, reply) => {
		const { id } = request.params as { id: string };

		try {
			const match = getMatchById(id);
			return reply.code(200).send({ success: true, data: match });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(404).send({ success: false, message: "Match not found" });
		}
	});
}
