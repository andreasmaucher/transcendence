import { getOrCreateSingleGame } from "../managers/singleGameManager.js";
import { getOrCreateTournament } from "../managers/tournamentManager.js";

export function createTestTournaments() {
	for (let i = 1; i <= 5; i++) {
		const id: string = "test_" + crypto.randomUUID();
		const name: string = `testTournament${i}`;
		getOrCreateTournament(id, name, 4);
	}
}

export function createTestSingleGames() {
	for (let i = 1; i <= 5; i++) {
		const id: string = "test_" + crypto.randomUUID();
		getOrCreateSingleGame(id, "remote");
	}
}
