export function createGameInvite(gameId: string, type: string): string {
	//return `wss://localhost:4000/api/${type}/${gameId}/ws`;
	return `ws://localhost:4000/api/${type}/${gameId}/ws`;
}
