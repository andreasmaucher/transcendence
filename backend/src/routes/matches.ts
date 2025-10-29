import { FastifyInstance } from "fastify";
import { getMatchById } from "../database/helpers/match_getters.js";

export default async function matchRoutes(fastify: FastifyInstance) {
	fastify.get("/api/matches/:id", async (request, reply) => {
		const { id } = request.params as { id: string };
		const match = getMatchById(id);
		if (!match) return reply.code(404).send({ error: "Match not found" });
		return match;
	});
}
