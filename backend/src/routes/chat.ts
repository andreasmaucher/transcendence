import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticateRequest } from "../auth/verify.js";
import { buildChatHistory } from "../managers/chatManager.js";

export default async function chatRoutes(fastify: FastifyInstance) {
	// GET user chat history
	fastify.get("/api/chat/history", async (request: FastifyRequest, reply: FastifyReply) => {
		// Check if cookies are valid
		const payload = authenticateRequest(request, reply);
		if (!payload) return reply.code(401).send({ success: false, message: "Unauthorized" });

		try {
			const chatHistory = buildChatHistory(payload.username);
			return reply.code(200).send({ success: true, data: chatHistory });
		} catch (error: any) {
			console.error("[chatRT]", error.message);
			return reply.code(404).send({ success: false, message: "Unable to retrieve chat history" });
		}
	});
}
