import { FastifyInstance } from "fastify";
import { getJsonUserByUsername, getUsername } from "../database/helpers/user_getters.js";
import { verifyPassword, hashPassword } from "../user/password.js";
import { registerUserDB } from "../database/helpers/user_setters.js";

export default async function userRoutes(fastify: FastifyInstance) {

	// Get user by username
	fastify.get("/api/users/:username", async (request, reply) => {
		const { username } = request.params as { username: string };

		try {
			const user = getJsonUserByUsername(username);
			return reply.code(200).send({ success: true, data: user });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(404).send({ success: false, message: "User not found" });
		}
	});

	// Check if username exists (return boolean)
	fastify.post("/api/users/check", async (request, reply) => {
		const { username } = request.body as { username: string };

		const exists = getUsername(username);
		return reply.code(200).send({ success: true, exists });
	});

	// Check if login credentials are valid
	fastify.post("/api/users/login", async (request, reply) => {
		const { username, password } = request.body as { username: string; password: string };

		const isValid = await verifyPassword(username, password);
		if (!isValid)
			return reply.code(401).send({ success: false, message: "Invalid credentials" });

		return reply.code(200).send({ success: true, message: "Login successful" });
	});

	// Register a new user
	fastify.post("/api/users/register", async (request, reply) => {
		const { username, password, avatar } = request.body as { username: string; password: string; avatar: string };

		try {
			const hashedPassword = await hashPassword(password);
			registerUserDB(username, hashedPassword, avatar);
			return reply.code(200).send({ success: true, message: "Registration successful" });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(500).send({ success: false, message: "Registration failed" });
			
		}
	});
}