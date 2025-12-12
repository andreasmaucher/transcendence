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

			// For local single-player games, use a synthetic tournamentId and
			// a per-game unique gameId based on timestamp so repeated games
			// for the same player still get distinct records on-chain.
			const tournamentId = `local-single:${body.player1}`;
			const gameId = `${body.player1}-${body.player2}-${Date.now().toString()}`;

			const receipt = await saveMatchOnChain({
				tournamentId,
				gameId,
				gameIndex: nowTs,
				playerLeft: body.player1,
				playerRight: body.player2,
				scoreLeft: body.score1,
				scoreRight: body.score2,
			});

			request.log.info({ txHash: receipt.hash }, "[BLOCKCHAIN] Local game written to chain");

			return reply.send({
				success: true,
				data: {
					txHash: receipt?.hash,
				},
			});
		} catch (err) {
			const anyErr = err as any;
			const reason = anyErr?.reason || anyErr?.shortMessage || anyErr?.info?.error?.message || anyErr?.message;

			if (typeof reason === "string" && /game already saved/i.test(reason)) {
				request.log.info({ err }, "[BLOCKCHAIN] local game already saved on-chain");
				return reply.send({
					success: true,
					data: {
						alreadySaved: true,
					},
				});
			}

			return reply.code(500).send({
				success: false,
				error: "BLOCKCHAIN_WRITE_FAILED",
				message: "Failed to store local game on blockchain",
			});
		}
	});
}
