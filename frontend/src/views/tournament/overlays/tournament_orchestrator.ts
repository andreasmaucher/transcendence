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
		if (!semiFinalMatchIds.sf1) {
			semiFinalMatchIds.sf1 = matchId;
			// ANDY: store player display names from ws payload
			if (leftPlayer?.username && rightPlayer?.username) {
				internalBracket.players[0] = {
					username: leftPlayer.username,
					displayName: leftPlayer.displayName || leftPlayer.username,
				};
				internalBracket.players[1] = {
					username: rightPlayer.username,
					displayName: rightPlayer.displayName || rightPlayer.username,
				};
			}
		} else if (!semiFinalMatchIds.sf2 && semiFinalMatchIds.sf1 !== matchId) {
			semiFinalMatchIds.sf2 = matchId;
			// ANDY: store player display names from ws payload
			if (leftPlayer?.username && rightPlayer?.username) {
				internalBracket.players[2] = {
					username: leftPlayer.username,
					displayName: leftPlayer.displayName || leftPlayer.username,
				};
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
		if (tournamentMatchType === "final") {
			showTournamentOverlay("match-ready", {
				roundLabel: "Final Match",
				bracket: internalBracket as any,
				focusedPlayerUsername: me,
			});
			return;
		}

		if (tournamentMatchType === "thirdPlace") {
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
