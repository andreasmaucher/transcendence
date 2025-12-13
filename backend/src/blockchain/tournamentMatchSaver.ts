import { isBlockchainConfigured, saveMatchOnChain } from "../config/blockchain.js";
import type { Match } from "../types/match.js";
import type { Tournament } from "../types/game.js";
import { buildPayload, gameBroadcast } from "../transport/broadcaster.js";

export type TournamentMatchChainSaved = {
	key: string;
	tournamentId: string;
	matchId: string;
	gameIndex: number;
	playerLeft: string;
	playerRight: string;
	scoreLeft: number;
	scoreRight: number;
	winner: string;
	txHash?: string;
	alreadySaved?: boolean;
};

const saveCache = new Map<string, TournamentMatchChainSaved>();
const saveInflight = new Map<string, Promise<TournamentMatchChainSaved>>();

function computeTournamentMatchKey(tournamentId: string, matchId: string): string {
	return `${tournamentId}:${matchId}`;
}

function computeSequentialGameIndex(tournament: Tournament, matchId: string): number {
	const rounds = Array.from(tournament.matches.keys()).sort((a, b) => a - b);
	let fallbackSequential = 0;
	for (const round of rounds) {
		const matches = tournament.matches.get(round) ?? [];
		for (let i = 0; i < matches.length; i++) {
			fallbackSequential += 1;
			if (matches[i]?.id === matchId) {
				// Encode bracket position in a single uint32:
				// round * 100 + matchNumberInRound (1-based)
				return round * 100 + (i + 1);
			}
		}
	}
	// Fallback: at least provide a stable-ish index if the match isn't found
	return fallbackSequential > 0 ? fallbackSequential : 1;
}

function extractFinalResult(match: Match): {
	playerLeft: string;
	playerRight: string;
	scoreLeft: number;
	scoreRight: number;
	winner: string;
} {
	const playerLeft = match.players.left;
	const playerRight = match.players.right;
	if (!playerLeft || !playerRight) {
		throw new Error("MATCH_NOT_COMPLETE");
	}

	const useLastResult = !match.state.isOver && !!match.lastResult;
	const scoreLeft = useLastResult ? match.lastResult!.scoreLeft : match.state.score.left;
	const scoreRight = useLastResult ? match.lastResult!.scoreRight : match.state.score.right;
	const winnerSide = useLastResult ? match.lastResult!.winnerSide : match.state.winner;
	const winner = winnerSide === "left" ? playerLeft : winnerSide === "right" ? playerRight : "Draw";

	return { playerLeft, playerRight, scoreLeft, scoreRight, winner };
}

export function getTournamentMatchChainSave(tournamentId: string, matchId: string): TournamentMatchChainSaved | undefined {
	return saveCache.get(computeTournamentMatchKey(tournamentId, matchId));
}

export function saveTournamentMatchToChain(match: Match, tournament: Tournament): Promise<TournamentMatchChainSaved> {
	const tournamentId = tournament.id;
	const key = computeTournamentMatchKey(tournamentId, match.id);

	const cached = saveCache.get(key);
	if (cached) return Promise.resolve(cached);

	const inflight = saveInflight.get(key);
	if (inflight) return inflight;

	const promise = (async (): Promise<TournamentMatchChainSaved> => {
		if (!isBlockchainConfigured) {
			throw new Error("BLOCKCHAIN_NOT_CONFIGURED");
		}

		const gameIndex = computeSequentialGameIndex(tournament, match.id);
		const { playerLeft, playerRight, scoreLeft, scoreRight, winner } = extractFinalResult(match);

		const chainTournamentId = `tournament:${tournament.id}`;
		const chainGameId = match.id;

		// Notify match participants immediately; saving is async and should not block tournament progression.
		try {
			gameBroadcast(
				buildPayload("tournament-match-save-started", {
					tournamentId: chainTournamentId,
					matchId: chainGameId,
					gameIndex,
					playerLeft,
					playerRight,
					scoreLeft,
					scoreRight,
					winner,
				} as any),
				match
			);
		} catch {
			// Best-effort notification only.
		}

		try {
			const receipt = await saveMatchOnChain({
				tournamentId: chainTournamentId,
				gameId: chainGameId,
				gameIndex,
				playerLeft,
				playerRight,
				scoreLeft,
				scoreRight,
			});

			const txHash = receipt?.hash;
			const data: TournamentMatchChainSaved = {
				key,
				tournamentId: chainTournamentId,
				matchId: chainGameId,
				gameIndex,
				playerLeft,
				playerRight,
				scoreLeft,
				scoreRight,
				winner,
				txHash,
			};
			saveCache.set(key, data);

			try {
				gameBroadcast(buildPayload("tournament-match-saved", data as any), match);
			} catch {
				// Best-effort notification only.
			}
			return data;
		} catch (err) {
			const anyErr = err as any;
			const reason = anyErr?.reason || anyErr?.shortMessage || anyErr?.info?.error?.message || anyErr?.message;
			if (typeof reason === "string" && /game already saved/i.test(reason)) {
				const data: TournamentMatchChainSaved = {
					key,
					tournamentId: chainTournamentId,
					matchId: chainGameId,
					gameIndex,
					playerLeft,
					playerRight,
					scoreLeft,
					scoreRight,
					winner,
					alreadySaved: true,
				};
				saveCache.set(key, data);

				try {
					gameBroadcast(buildPayload("tournament-match-saved", data as any), match);
				} catch {
					// Best-effort notification only.
				}
				return data;
			}

			try {
				gameBroadcast(
					buildPayload("tournament-match-save-failed", {
						tournamentId: chainTournamentId,
						matchId: chainGameId,
						gameIndex,
						error: typeof reason === "string" ? reason : "BLOCKCHAIN_WRITE_FAILED",
					} as any),
					match
				);
			} catch {
				// Best-effort notification only.
			}
			throw err;
		} finally {
			saveInflight.delete(key);
		}
	})();

	saveInflight.set(key, promise);
	return promise;
}

// Fire-and-forget wrapper so tournament progression is never blocked by tx confirmation.
export function triggerTournamentMatchSave(match: Match, tournament: Tournament): void {
	void saveTournamentMatchToChain(match, tournament)
		.then((data) => {
			const txInfo = data.txHash ? `tx=${data.txHash}` : data.alreadySaved ? "alreadySaved" : "no-tx";
			console.log(
				`[BLOCKCHAIN] tournament match saved: tournament=${tournament.id} match=${match.id} index=${data.gameIndex} ${txInfo}`
			);
		})
		.catch((err) => {
			// Don't crash gameplay if chain write fails.
			console.warn(
				`[BLOCKCHAIN] tournament match save failed: tournament=${tournament.id} match=${match.id}`,
				err
			);
		});
}
