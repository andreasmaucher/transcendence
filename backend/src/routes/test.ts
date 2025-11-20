import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAllUsersDB } from "../database/users/getters.js";
import { getAllMatchesDB } from "../database/matches/getters.js";
import { getAllTournamentsDB } from "../database/tournaments/getters.js";
import { getAllMessagesDB } from "../database/messages/getters.js";

export default async function testRoutes(fastify: FastifyInstance) {
	// RETURN all users and PRINT them in backend logs
	fastify.get("/api/test/print-users", async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			const users = getAllUsersDB();
			console.log(users);
			return reply.code(200).send({ success: true, data: users });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(500).send({ success: false, message: "Unable to retrieve users" });
		}
	});

	// RETURN all matches and PRINT them in backend logs
	fastify.get("/api/test/print-matches", async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			const matches = getAllMatchesDB();
			console.log(matches);
			return reply.code(200).send({ success: true, data: matches });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(500).send({ success: false, message: "Unable to retrieve matches" });
		}
	});

	// RETURN all tournaments and PRINT them in backend logs
	fastify.get("/api/test/print-tournaments", async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			const tournaments = getAllTournamentsDB();
			console.log(tournaments);
			return reply.code(200).send({ success: true, data: tournaments });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(500).send({ success: false, message: "Unable to retrieve tournaments" });
		}
	});

	// RETURN all messages and PRINT them in backend logs
	fastify.get("/api/test/print-messages", async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			const messages = getAllMessagesDB();
			console.log(messages);
			return reply.code(200).send({ success: true, data: messages });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(500).send({ success: false, message: "Unable to retrieve messages" });
		}
	});
}
