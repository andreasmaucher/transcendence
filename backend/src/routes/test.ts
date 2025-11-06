import { FastifyInstance } from "fastify";
import { getAllUsers } from "../database/users.ts/getters.js";

export default async function testRoutes(fastify: FastifyInstance) {
	// RETURN all users and PRINT them in backend logs
	fastify.get("/api/users/print", async (request, reply) => {
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
}
