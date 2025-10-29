import type { Match } from "../types/game.js";
import { createInitialState } from "./state.js";
import { startMatch } from "../database/helpers/match_setters.js";

export function createMatch(id: string, tournament_id: string): Match {
	let match = {
		id,
		tournament_id: tournament_id,
		state: createInitialState(),
		inputs: { left: 0, right: 0 },
		clients: new Set(),
	} as Match;
  // Log new match in SQLite
  try {
	startMatch(match.id, tournament_id, 0, 0);
  } catch (err) {
	console.error(`[db] Failed to insert match ${id} for tournament ${tournament_id}:`, err);
  }
  return match;
}
