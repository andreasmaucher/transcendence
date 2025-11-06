import { FastifyInstance } from "fastify";
import { getAllUsers } from "../database/users/getters.js";
import { getAllMatches } from "../database/matches/getters.js";
import { getAllTournaments } from "../database/tournaments/getters.js";

export default async function testRoutes(fastify: FastifyInstance) {
	// RETURN all users and PRINT them in backend logs
	fastify.get("/api/test/print-users", async (request, reply) => {
		try {
			const users = getAllUsers();
			console.log(users);
			return reply.code(200).send({ success: true, data: users });
		} catch (error: any) {
			console.log(error.message);
			return reply
				.code(500)
				.send({ success: false, message: "Unable to retrieve users" });
		}
	});

	// RETURN all matches and PRINT them in backend logs
	fastify.get("/api/test/print-matches", async (request, reply) => {
		try {
			const matches = getAllMatches();
			console.log(matches);
			return reply.code(200).send({ success: true, data: matches });
		} catch (error: any) {
			console.log(error.message);
			return reply
				.code(500)
				.send({ success: false, message: "Unable to retrieve matches" });
		}
	});

	// RETURN all tournaments and PRINT them in backend logs
	fastify.get("/api/test/print-tournaments", async (request, reply) => {
		try {
			const tournaments = getAllTournaments();
			console.log(tournaments);
			return reply.code(200).send({ success: true, data: tournaments });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(500).send({
				success: false,
				message: "Unable to retrieve tournaments",
			});
		}
	});
}
