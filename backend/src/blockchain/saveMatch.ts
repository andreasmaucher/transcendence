import { ethers } from "ethers";
import fs from "fs";

// Reads Avalanche Fuji RPC and private key from env/secrets
export function getAvalancheProvider() {
	const rpcUrl = process.env.VITE_FUJI_RPC_URL;
	return new ethers.JsonRpcProvider(rpcUrl);
}

export function getBackendWallet(provider: ethers.JsonRpcProvider) {
	const pk = fs.readFileSync("/run/secrets/chain_private_key", "utf8").trim();
	return new ethers.Wallet(pk, provider);
}

// Contract ABI and address for TournamentMatches
const CONTRACT_ABI = [
	"function saveMatch(string tournamentId, string gameId, uint256 gameIndex, string playerLeft, string playerRight, uint8 scoreLeft, uint8 scoreRight) public"
];
const BLOCKCHAIN_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

/**
 * Save a match result to the blockchain.
 * @param tournamentId - The tournament ID (string)
 * @param gameId - The match/game ID (string)
 * @param gameIndex - The index of the game in the tournament (number)
 * @param playerLeft - Username of the left player (string)
 * @param playerRight - Username of the right player (string)
 * @param scoreLeft - Final score for left player (number)
 * @param scoreRight - Final score for right player (number)
 * @returns Transaction hash (string)
 */
export async function saveMatchToBlockchain(
	tournamentId: string,
	gameId: string,
	gameIndex: number,
	playerLeft: string,
	playerRight: string,
	scoreLeft: number,
	scoreRight: number
): Promise<string> {
	const provider = getAvalancheProvider();
	const wallet = getBackendWallet(provider);
	const contract = new ethers.Contract(BLOCKCHAIN_CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

	// Logging all arguments for debugging
	console.log('[Blockchain] saveMatchToBlockchain arguments:', {
		tournamentId,
		gameId,
		gameIndex,
		playerLeft,
		playerRight,
		scoreLeft,
		scoreRight
	});

	// Ensure types are correct for contract call
	const tx = await contract.saveMatch(
		tournamentId,
		gameId,
		gameIndex,
		playerLeft,
		playerRight,
		scoreLeft,
		scoreRight
	);
	return tx.hash;
}
