import { FastifyInstance } from "fastify";
import { getUserByUsername, getUsername } from "../database/helpers/user_getters.js";
import { verifyPassword } from "../user/password.js";

export default async function userRoutes(fastify: FastifyInstance) {

	fastify.get("/api/users/:id", async (request, reply) => {
		const { id } = request.params as { id: string };
		const user = getUserByUsername(id);
		if (!user) return reply.code(404).send({ error: "User not found" });
		return user;
	});

	fastify.get("/api/users/:username", async (request, reply) => {
		const { username } = request.params as { username: string };
		const name = getUsername(username);
		return name;
	});

	fastify.get("/api/users/id:/:password", async (request, reply) => {
		const { id, password } = request.params as { id: string; password: string };
		const result = verifyPassword(id, password);
		return result;
	});
}