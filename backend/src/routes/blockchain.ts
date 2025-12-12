import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { isBlockchainConfigured, saveMatchOnChain } from "../config/blockchain.js";
import { getMatchInSingleGame } from "../managers/singleGameManager.js";

type RemoteSavedData = {
	txHash: string;
	playerLeft: string;
	playerRight: string;
	scoreLeft: number;
	scoreRight: number;
	winner: string;
};

// Ensures both clients get the same result even if they both request saving.
// - cache: after the first successful save
// - inflight: de-dupe concurrent requests during the save
const remoteSaveCache = new Map<string, RemoteSavedData>();
const remoteSaveInflight = new Map<string, Promise<RemoteSavedData>>();

type LocalGameBody = {
	player1: string;
	player2: string;
	winner: string;
	mode: string;
	score1: number;
	score2: number;
};

type RemoteGameBody = {
	matchId: string;
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

	app.post("/api/blockchain/remote-game", async (request: FastifyRequest, reply: FastifyReply) => {
		const body = request.body as RemoteGameBody;

		if (!isBlockchainConfigured) {
			request.log.warn("[BLOCKCHAIN] remote-game called but blockchain is not configured");
			return reply.code(503).send({
				success: false,
				error: "BLOCKCHAIN_NOT_CONFIGURED",
				message: "Blockchain is not configured on the server. Stats could not be recorded on-chain.",
			});
		}

		if (!body?.matchId || typeof body.matchId !== "string") {
			return reply.code(400).send({
				success: false,
				error: "BAD_REQUEST",
				message: "matchId is required",
			});
		}

		const cached = remoteSaveCache.get(body.matchId);
		if (cached) {
			return reply.send({ success: true, data: cached });
		}

		const existingInflight = remoteSaveInflight.get(body.matchId);
		if (existingInflight) {
			try {
				const data = await existingInflight;
				return reply.send({ success: true, data });
			} catch (err) {
				request.log.warn({ err, matchId: body.matchId }, "[BLOCKCHAIN] remote-game inflight failed");
				return reply.code(500).send({
					success: false,
					error: "BLOCKCHAIN_WRITE_FAILED",
					message: "Failed to store remote game on blockchain",
				});
			}
		}

		const inflight = (async (): Promise<RemoteSavedData> => {
			let match;
			try {
				match = getMatchInSingleGame(body.matchId);
			} catch {
				throw new Error("MATCH_NOT_FOUND");
			}
			if (!match) throw new Error("MATCH_NOT_FOUND");

			const playerLeft = match.players.left;
			const playerRight = match.players.right;
			if (!playerLeft || !playerRight) throw new Error("MATCH_NOT_COMPLETE");

			const useLastResult = !match.state.isOver && !!match.lastResult;
			const scoreLeft = useLastResult ? match.lastResult!.scoreLeft : match.state.score.left;
			const scoreRight = useLastResult ? match.lastResult!.scoreRight : match.state.score.right;
			const winnerSide = useLastResult ? match.lastResult!.winnerSide : match.state.winner;
			const winner = winnerSide === "left" ? playerLeft : winnerSide === "right" ? playerRight : "Draw";

			const nowTs = BigInt(Date.now());
			const tournamentId = `remote-single:${match.singleGameId || match.id}`;
			const gameId = match.id;

			request.log.info({ matchId: body.matchId }, "[BLOCKCHAIN] Writing remote game to chain...");
			const receipt = await saveMatchOnChain({
				tournamentId,
				gameId,
				gameIndex: nowTs,
				playerLeft,
				playerRight,
				scoreLeft,
				scoreRight,
			});

			const txHash = receipt?.hash;
			if (!txHash) throw new Error("MISSING_TX_HASH");

			const data: RemoteSavedData = {
				txHash,
				playerLeft,
				playerRight,
				scoreLeft,
				scoreRight,
				winner,
			};

			remoteSaveCache.set(body.matchId, data);
			request.log.info({ txHash }, "[BLOCKCHAIN] Remote game written to chain");
			return data;
		})();

		remoteSaveInflight.set(body.matchId, inflight);
		try {
			const data = await inflight;
			return reply.send({ success: true, data });
		} catch (err) {
			const cachedAfter = remoteSaveCache.get(body.matchId);
			if (cachedAfter) {
				return reply.send({ success: true, data: cachedAfter });
			}

			const message = err instanceof Error ? err.message : "BLOCKCHAIN_WRITE_FAILED";
			if (message === "MATCH_NOT_FOUND") {
				return reply.code(404).send({
					success: false,
					error: "MATCH_NOT_FOUND",
					message: "Match not found",
				});
			}
			if (message === "MATCH_NOT_COMPLETE") {
				return reply.code(409).send({
					success: false,
					error: "MATCH_NOT_COMPLETE",
					message: "Match does not have two players yet",
				});
			}

			const anyErr = err as any;
			const reason = anyErr?.reason || anyErr?.shortMessage || anyErr?.info?.error?.message || anyErr?.message;
			if (typeof reason === "string" && /game already saved/i.test(reason)) {
				// If the contract says it's already saved but we don't have a cached txHash
				// (e.g. server restart), we can't reliably provide a linkable tx.
				return reply.code(409).send({
					success: false,
					error: "GAME_ALREADY_SAVED",
					message: "Game already saved on-chain, but tx hash is not available on this server instance.",
				});
			}

			return reply.code(500).send({
				success: false,
				error: "BLOCKCHAIN_WRITE_FAILED",
				message: "Failed to store remote game on blockchain",
			});
		} finally {
			remoteSaveInflight.delete(body.matchId);
		}
	});
}
