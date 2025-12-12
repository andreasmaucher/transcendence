import { showTournamentOverlay, hideTournamentOverlay } from "./tournament_overlay";
import { userData } from "../../../config/constants";

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

/**
 * Reset when entering a new tournament
 */
export function resetTournamentOrchestrator() {
	internalBracket.players = [null, null, null, null];
	internalBracket.results = {};
	semiFinalMatchIds = {};
	currentRound = 1;
	currentMatchType = null;
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
			// ANDY: store player display names from ws payload - handle partial matches (when only one player exists)
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
			// ANDY: store player display names from ws payload - handle partial matches (when only one player exists)
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
			roundLabel: "Semi-finals",
			bracket: internalBracket as any,
			focusedPlayerUsername: me,
		});
		return;
	}

	// -------------------------------
	// ROUND 2: final / 3rd place
	// -------------------------------
	if (currentRound === 2) {
		// ANDY: update bracket results from match-assigned messages to show final/3rd place players
		// The bracket overlay computes final/3rd place from results.semiFinal1Winner/2Winner,
		// so we need to ensure those are set. When round 2 match-assigned arrives, we can infer
		// the round 1 winners from which players are in the final match.
		if (tournamentMatchType === "final") {
			// Update results if we can infer winners from the final match players
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
				roundLabel: "Final Match",
				bracket: internalBracket as any,
				focusedPlayerUsername: me,
			});
			return;
		}

		if (tournamentMatchType === "thirdPlace") {
			// For 3rd place, we can infer the losers from the players in the match
			// The bracket overlay will compute 3rd place from the losers of SF1 and SF2
			// which it derives from results.semiFinal1Winner/2Winner
			showTournamentOverlay("match-ready", {
				roundLabel: "3rd Place Match",
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

	const winner =
		state.winner === "left" ? leftUsername :
		state.winner === "right" ? rightUsername :
		null;

	if (!winner) return;

	const focused = userData.username ?? undefined;

	// -------------------------------
	// ROUND 1 RESULTS
	// -------------------------------
	if (currentRound === 1) {
		if (matchId === semiFinalMatchIds.sf1) {
			internalBracket.results.semiFinal1Winner = winner;
		}

		if (matchId === semiFinalMatchIds.sf2) {
			internalBracket.results.semiFinal2Winner = winner;
		}

		showTournamentOverlay("between-rounds", {
			title: "Round complete",
			bracket: internalBracket as any,
			focusedPlayerUsername: focused,
		});
		return;
	}

	// -------------------------------
	// FINAL RESULT
	// -------------------------------
	if (currentRound === 2 && currentMatchType === "final") {
		internalBracket.results.finalWinner = winner;

		showTournamentOverlay("final", {
			title: "Tournament Finished",
			bracket: internalBracket as any,
			focusedPlayerUsername: focused,
		});
		return;
	}

	// -------------------------------
	// THIRD PLACE RESULT
	// -------------------------------
	if (currentRound === 2 && currentMatchType === "thirdPlace") {
		internalBracket.results.thirdPlaceWinner = winner;

		showTournamentOverlay("between-rounds", {
			title: "3rd Place Decided",
			bracket: internalBracket as any,
			focusedPlayerUsername: focused,
		});
	}
}
