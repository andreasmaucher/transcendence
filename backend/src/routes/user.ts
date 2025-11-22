import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAllOnlineUsers, isUserOnline } from "../user/online.js";
import { getAllUsersDB, getUserByUsernameDB } from "../database/users/getters.js";
import { clearSessionCookie } from "../auth/session.js";
import { authenticateRequest } from "../auth/verify.js";

export default async function userRoutes(fastify: FastifyInstance) {
	// ROUTES FOR MULTIPLE USERS
	// GET all users in the database
	fastify.get("/api/users/all", async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			const users = getAllUsersDB();
			return reply.code(200).send({ success: true, data: users });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(500).send({ success: false, message: "Unable to retrieve users" });
		}
	});

	// GET all users currently online
	fastify.get("/api/users/online", async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			const users = getAllOnlineUsers();
			return reply.code(200).send({ success: true, data: users });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(500).send({ success: false, message: "Unable to retrieve users" });
		}
	});

	// ROUTES FOR ONE USER ONLY
	// GET user by username
	fastify.get("/api/user/:username", async (request: FastifyRequest, reply: FastifyReply) => {
		const { username } = request.params as { username: string };

		try {
			const user = getUserByUsernameDB(username);
			return reply.code(200).send({ success: true, data: user });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(404).send({ success: false, message: "User not found" });
		}
	});
	// CHECK if an user is online or not
	fastify.get("/api/user/online/:username", async (request: FastifyRequest, reply: FastifyReply) => {
		const { username } = request.params as { username: string };
		try {
			const online = isUserOnline(username);
			return reply.code(200).send({ success: true, online });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(500).send({ success: false, message: "Unable to find user" });
		}
	});

	// RETURN the current logged-in user, based on the session cookie
	fastify.get("/api/user/me", async (request: FastifyRequest, reply: FastifyReply) => {
		// Check if cookies are valid
		const payload = authenticateRequest(request, reply);
		if (!payload) return reply.code(401).send({ success: false, message: "Unauthorized" });

		// Look up the user by username in the database
		try {
			const user = getUserByUsernameDB(payload.username);
			// Return only safe fields to the frontend (omit password, provider secrets, etc.)
			const safeUser = {
				id: user.internal_id,
				username: user.username,
				avatar: user.avatar ?? null,
				created_at: user.created_at,
			};
			return reply.code(200).send({ success: true, data: safeUser });
		} catch (error: any) {
			console.log(error.message);
			clearSessionCookie(reply);
			return reply.code(404).send({ success: false, message: "User not found" });
		}
	});
}
