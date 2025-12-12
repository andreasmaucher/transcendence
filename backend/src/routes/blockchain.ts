//// filepath: /Users/mrizhakov/Documents/42/transcendence/backend/src/routes/blockchain.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { isBlockchainConfigured, saveMatchOnChain } from "../config/blockchain.js";

type LocalGameBody = {
	player1: string;
	player2: string;
	winner: string;
	mode: string;
	score1: number;
	score2: number;
};

export default async function blockchainRoutes(app: FastifyInstance) {
	app.post("/api/blockchain/local-game", async (request: FastifyRequest, reply: FastifyReply) => {
		const body = request.body as LocalGameBody;

		if (!isBlockchainConfigured) {
			request.log.warn("[BLOCKCHAIN] local-game called but blockchain is not configured");
			return reply.code(503).send({
				success: false,
				error: "BLOCKCHAIN_NOT_CONFIGURED",
				message: "Blockchain is not configured on the server. Stats could not be recorded on-chain.",
			});
		}

		const nowTs = BigInt(Date.now());

		try {
			request.log.info({ body }, "[BLOCKCHAIN] Writing local game to chain...");

			const receipt = await saveMatchOnChain({
				player1: body.player1,
				player2: body.player2,
				timestamp: nowTs,
				mode: body.mode,
				winner: body.winner,
				score1: body.score1,
				score2: body.score2,
			});

			// if (!receipt) {
			// 	request.log.error("[BLOCKCHAIN] saveMatchOnChain returned null/undefined for local game");
			// 	return reply.code(500).send({
			// 		success: false,
			// 		error: "BLOCKCHAIN_WRITE_FAILED",
			// 		message: "Failed to store local game on the blockchain.",
			// 	});
			// }

			request.log.info({ txHash: receipt.hash }, "[BLOCKCHAIN] Local game written to chain");

			return reply.send({
				success: true,
				data: {
					txHash: receipt?.hash,
				},
			});
		} catch (err) {
			request.log.error({ err }, "[BLOCKCHAIN] local game write failed");
			return reply.code(500).send({
				success: false,
				error: "BLOCKCHAIN_WRITE_FAILED",
				message: "Failed to store local game on blockchain",
			});
		}
	});
}
