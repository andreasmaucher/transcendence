import { getOrCreateSingleGame } from "../managers/singleGameManager.js";
import { getOrCreateTournament } from "../managers/tournamentManager.js";

export function createTestTournaments() {
	for (let i = 1; i <= 5; i++) {
		const name: string = `testTournament${i}`;
		getOrCreateTournament(name, name, 4);
	}
}

export function createTestSingleGames() {
	for (let i = 1; i <= 5; i++) {
		const name: string = `testOnlineSingleGame${i}`;
		getOrCreateSingleGame(name, "remote");
	}
}
