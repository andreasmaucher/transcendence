import { showTournamentOverlay, hideTournamentOverlay } from "./tournament_overlay";
import { userData } from "../../../config/constants";
import { t } from "../../../i18n";

/**
 * INTERNAL STATE
 * Tournament is reconstructed purely from match identity.
 */

interface InternalPlayer {
	username: string;
	displayName?: string;
}

interface InternalBracket {
	players: [
		InternalPlayer | null,
		InternalPlayer | null,
		InternalPlayer | null,
		InternalPlayer | null
	];
	results: {
		semiFinal1Winner?: string;
		semiFinal2Winner?: string;
		finalWinner?: string;
		thirdPlaceWinner?: string;
	};
}

const internalBracket: InternalBracket = {
	players: [null, null, null, null],
	results: {},
};

// ---- ROUND / MATCH TRACKING ----
let currentRound = 1;
let currentMatchType: "normal" | "final" | "thirdPlace" | string | null = null;

// ---- SEMIFINAL MATCH IDS (ROUND 1) ----
let semiFinalMatchIds: {
	sf1?: string;
	sf2?: string;
} = {};

// ---- ROUND 2 MATCH IDS ----
let round2MatchIds: {
	final?: string;
	thirdPlace?: string;
} = {};

// ANDY: track match type by matchId (so we can determine match type even if currentMatchType was overwritten)
const matchTypeMap = new Map<string, { round: number; type: string }>();

// Export function to get all tournament match IDs for tx status display
export function getTournamentMatchIds(): {
	sf1?: string;
	sf2?: string;
	final?: string;
	thirdPlace?: string;
} {
	return {
		...semiFinalMatchIds,
		...round2MatchIds,
	};
}

// ANDY: export function to get match type (for use in game.ts)
export function getMatchType(matchId: string): string | undefined {
	return matchTypeMap.get(matchId)?.type;
}

//Check if a match is in round 2 (final or 3rd place)
export function isMatchInRound2(matchId: string): boolean {
	const matchInfo = matchTypeMap.get(matchId);
	// ANDY: convert round to number for comparison (handles both number and string)
	const round = matchInfo?.round;
	const roundNum = round !== undefined ? (typeof round === 'number' ? round : parseInt(String(round), 10)) : undefined;
	return roundNum === 2;
}

/**
 * Reset when entering a new tournament
 */
export function resetTournamentOrchestrator() {
	internalBracket.players = [null, null, null, null];
	internalBracket.results = {};
	semiFinalMatchIds = {};
	round2MatchIds = {};
	currentRound = 1;
	currentMatchType = null;
	matchTypeMap.clear();
}

/**
 * Called on WS "match-assigned"
 * ONLY responsible for:
 * - tracking round
 * - tracking match type
 * - registering semifinal match IDs
 * - storing player display names from WebSocket payload
 * - triggering MATCH-READY overlays
 */
export function handleTournamentMatchAssigned(data: any) {
	const { matchId, round, tournamentMatchType, leftPlayer, rightPlayer } = data;

	currentRound = round ?? 1;
	currentMatchType = tournamentMatchType;
	
	// ANDY: store match type by matchId so we can look it up later
	if (matchId && round && tournamentMatchType) {
		// ANDY: ensure round is stored as a number for consistent comparison
		const roundNum = typeof round === 'number' ? round : parseInt(round, 10);
		matchTypeMap.set(matchId, { round: roundNum, type: tournamentMatchType });
	}

	const me = userData.username ?? undefined;

	// -------------------------------
	// ROUND 1: identify SF1 / SF2 and store player display names
	// -------------------------------
	if (currentRound === 1 && tournamentMatchType === "normal") {
		// ANDY: use matchIndex from backend to identify which match (0=SF1, 1=SF2)
		const matchIndex = data.matchIndex;
		
		if (matchIndex === 0) {
			if (!semiFinalMatchIds.sf1) {
				semiFinalMatchIds.sf1 = matchId;
			}
			// ANDY: store player display names from ws payload
			if (leftPlayer?.username) {
				internalBracket.players[0] = {
					username: leftPlayer.username,
					displayName: leftPlayer.displayName || leftPlayer.username,
				};
			}
			if (rightPlayer?.username) {
				internalBracket.players[1] = {
					username: rightPlayer.username,
					displayName: rightPlayer.displayName || rightPlayer.username,
				};
			}
		} else if (matchIndex === 1) {
			if (!semiFinalMatchIds.sf2) {
				semiFinalMatchIds.sf2 = matchId;
			}
			// ANDY: store player display names from ws payload
			if (leftPlayer?.username) {
				internalBracket.players[2] = {
					username: leftPlayer.username,
					displayName: leftPlayer.displayName || leftPlayer.username,
				};
			}
			if (rightPlayer?.username) {
				internalBracket.players[3] = {
					username: rightPlayer.username,
					displayName: rightPlayer.displayName || rightPlayer.username,
				};
			}
		}

		showTournamentOverlay("match-ready", {
			roundLabel: t("tournaments.semiFinals"),
			roundLabelKey: "tournaments.semiFinals",
			bracket: internalBracket as any,
			focusedPlayerUsername: me,
		});
		return;
	}

	// -------------------------------
	// ROUND 2: final / 3rd place
	// -------------------------------
	if (currentRound === 2) {
		// ANDY: update results from match-assigned messages to show final/3rd place players
		if (tournamentMatchType === "final") {
			// Store final match ID for tx status tracking
			round2MatchIds.final = matchId;
			
			// If both players are set, we can determine who won each semifinal
			if (leftPlayer?.username && rightPlayer?.username) {
				// Check which semifinal each player came from
				const sf1Players = [internalBracket.players[0], internalBracket.players[1]].filter(Boolean);
				const sf2Players = [internalBracket.players[2], internalBracket.players[3]].filter(Boolean);
				
				// Determine winners based on which semifinal the final players came from
				const leftFromSF1 = sf1Players.some(p => p?.username === leftPlayer.username);
				const rightFromSF1 = sf1Players.some(p => p?.username === rightPlayer.username);
				
				if (leftFromSF1 && !rightFromSF1) {
					// Left player from SF1, right from SF2
					internalBracket.results.semiFinal1Winner = leftPlayer.username;
					internalBracket.results.semiFinal2Winner = rightPlayer.username;
				} else if (!leftFromSF1 && rightFromSF1) {
					// Left player from SF2, right from SF1
					internalBracket.results.semiFinal1Winner = rightPlayer.username;
					internalBracket.results.semiFinal2Winner = leftPlayer.username;
				}
			}
			
			showTournamentOverlay("match-ready", {
				roundLabel: t("tournaments.finalMatch"),
				roundLabelKey: "tournaments.finalMatch",
				bracket: internalBracket as any,
				focusedPlayerUsername: me,
			});
			return;
		}

		if (tournamentMatchType === "thirdPlace") {
			// Store 3rd place match ID for tx status tracking
			round2MatchIds.thirdPlace = matchId;
			
			// For 3rd place we can infer the losers from the players in the match
			showTournamentOverlay("match-ready", {
				roundLabel: t("tournaments.thirdPlaceFinal"),
				roundLabelKey: "tournaments.thirdPlaceFinal",
				bracket: internalBracket as any,
				focusedPlayerUsername: me,
			});
			return;
		}
	}

	hideTournamentOverlay();
}

/**
 * Called from WS "state"
 * Responsible for:
 * - computing winners
 * - triggering BETWEEN / FINAL overlays

 */
export function handleTournamentMatchState(
	state: any,
	matchId: string,
	leftUsername: string | null,
	rightUsername: string | null
) {
	// -------------------------------
	// IGNORE NON-FINISHED MATCHES
	// -------------------------------
	if (!state.isOver || state.winner == null) return;

	const me = userData.username;
	const isMyMatch =
		me === leftUsername || me === rightUsername;

	// If this match is not the one the user is playing, do nothing
	if (!isMyMatch) return;

	const winner =
		state.winner === "left" ? leftUsername :
		state.winner === "right" ? rightUsername :
		null;

	if (!winner) return;

	const focused = userData.username ?? undefined;

	// ANDY: determine round from matchTypeMap instead of relying on currentRound (which can be overwritten)
	// This ensures we correctly identify Round 2 matches even if currentRound was overwritten by a later match-assigned message
	const matchInfo = matchTypeMap.get(matchId);
	const matchRound = matchInfo?.round;
	const matchRoundNum = matchRound !== undefined ? (typeof matchRound === 'number' ? matchRound : parseInt(String(matchRound), 10)) : currentRound;

	// -------------------------------
	// ROUND 1 RESULTS
	// -------------------------------
	if (matchRoundNum === 1) {
		if (matchId === semiFinalMatchIds.sf1) {
			internalBracket.results.semiFinal1Winner = winner;
		}

		if (matchId === semiFinalMatchIds.sf2) {
			internalBracket.results.semiFinal2Winner = winner;
		}

		showTournamentOverlay("between-rounds", {
			title: t("tournaments.roundComplete"),
			titleKey: "tournaments.roundComplete",
			bracket: internalBracket as any,
			focusedPlayerUsername: focused,
		});
		return;
	}

	// -------------------------------
	// ROUND 2: FINAL OR 3RD PLACE
	// -------------------------------
	if (matchRoundNum === 2) {
		const me = userData.username;
		let rankTitleKey: string | null = null;

		const isFinalMatch =
			matchInfo?.type === "final" ||
			winner === internalBracket.results.semiFinal1Winner ||
			winner === internalBracket.results.semiFinal2Winner ||
			matchInfo?.type !== "thirdPlace";

		if (isFinalMatch) {
			// FINAL MATCH
			internalBracket.results.finalWinner = winner;

			rankTitleKey =
				winner === me
					? "tournaments.rankChampion"
					: "tournaments.rankSecond";

			showTournamentOverlay("final", {
				title: t(rankTitleKey),
				titleKey: rankTitleKey,
				bracket: internalBracket as any,
				focusedPlayerUsername: focused,
			});

			return;
		} else {
			// 3RD PLACE MATCH
			internalBracket.results.thirdPlaceWinner = winner;

			rankTitleKey =
				winner === me
					? "tournaments.rankThird"
					: "tournaments.rankFourth";

			showTournamentOverlay("final", {
				title: t(rankTitleKey),
				titleKey: rankTitleKey,
				bracket: internalBracket as any,
				focusedPlayerUsername: focused,
			});

			return;
		}
	}
}
