// routes/matches.ts
import { FastifyInstance } from "fastify";
import { getMatchById } from "../database/helpers/match_getters.js";

export default async function matchRoutes(fastify: FastifyInstance) {
	fastify.get("/api/matches/:roomId", async (request, reply) => {
		const { roomId } = request.params as { roomId: string };
		const match = getMatchById(roomId);
		if (!match) return reply.code(404).send({ error: "Match not found" });
		return match;
	});
}
