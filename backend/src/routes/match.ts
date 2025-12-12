import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAllMatchesDB, getMatchByIdDB } from "../database/matches/getters.js";

export default async function matchRoutes(fastify: FastifyInstance) {
	// ROUTES FOR MULTIPLE MATCHES
	// GET all matches in the database
	fastify.get("/api/matches/all", async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			const matches = getAllMatchesDB();
			return reply.code(200).send({ success: true, data: matches });
		} catch (error: any) {
			console.error("[matchRT]", error.message);
			return reply.code(500).send({ success: false, message: "Unable to retrieve matches" });
		}
	});

	// ROUTES FOR ONE MATCH ONLY
	// GET a match by id
	fastify.get("/api/match/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		const { id } = request.params as { id: string };

		try {
			const match = getMatchByIdDB(id);
			return reply.code(200).send({ success: true, data: match });
		} catch (error: any) {
			console.error("[matchRT]", error.message);
			return reply.code(404).send({ success: false, message: "Match not found" });
		}
	});
}
