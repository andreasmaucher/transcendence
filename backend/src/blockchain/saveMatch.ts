import { ethers } from "ethers";
import fs from "fs";

// =============================================================================
// Singleton blockchain configuration with NonceManager for concurrent tx safety
// =============================================================================

// Read private key from Docker secret
function readSecret(path: string): string | undefined {
	try {
		return fs.readFileSync(path, "utf8").trim();
	} catch {
		return undefined;
	}
}

// Configuration from environment
const RPC_URL = process.env.RPC_URL || process.env.VITE_FUJI_RPC_URL || process.env.FUJI_RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || process.env.VITE_CONTRACT_ADDRESS || "";
const PRIVATE_KEY = process.env.CHAIN_PRIVATE_KEY || readSecret("/run/secrets/chain_private_key");

const isBlockchainConfigured = Boolean(RPC_URL && CONTRACT_ADDRESS && PRIVATE_KEY);

// Contract ABI for TournamentMatches
const CONTRACT_ABI = [
	"function saveMatch(string tournamentId, string gameId, uint256 gameIndex, string playerLeft, string playerRight, uint8 scoreLeft, uint8 scoreRight) public"
];

// Singleton instances - created once at module load time
let provider: ethers.JsonRpcProvider | undefined;
let signer: ethers.NonceManager | undefined;
let contract: ethers.Contract | undefined;

if (isBlockchainConfigured) {
	provider = new ethers.JsonRpcProvider(RPC_URL!);
	const baseWallet = new ethers.Wallet(PRIVATE_KEY!, provider);
	// NonceManager wraps the wallet and handles nonce management for concurrent transactions
	// It queues transactions and assigns sequential nonces, preventing REPLACEMENT_UNDERPRICED errors
	signer = new ethers.NonceManager(baseWallet);
	contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
	console.log("[Blockchain] Configured with NonceManager for concurrent transaction safety");
} else {
	console.warn("[Blockchain] config missing: RPC_URL / CONTRACT_ADDRESS / PRIVATE_KEY — on-chain writes disabled");
}

// =============================================================================
// Transaction Queue - Serializes all blockchain writes to prevent nonce issues
// =============================================================================

// Queue to serialize transaction submissions
let txQueue: Promise<void> = Promise.resolve();

/**
 * Wraps a transaction function in a queue to ensure sequential execution.
 * This prevents nonce collisions when multiple matches end simultaneously.
 */
async function queueTransaction<T>(txFn: () => Promise<T>): Promise<T> {
	// Chain this transaction to the queue
	const resultPromise = txQueue.then(async () => {
		return await txFn();
	}).catch(async (err) => {
		// Even if previous tx in queue failed, we still try this one
		return await txFn();
	});
	
	// Update the queue to wait for this transaction (but don't propagate errors to next in queue)
	txQueue = resultPromise.then(() => {}, () => {});
	
	return resultPromise;
}

/**
 * Save a match result to the blockchain.
 * Uses a transaction queue + NonceManager to handle concurrent transactions safely.
 * 
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
	if (!isBlockchainConfigured || !contract) {
		throw new Error("BLOCKCHAIN_NOT_CONFIGURED");
	}

	// Queue this transaction to ensure it doesn't conflict with other concurrent saves
	return queueTransaction(async () => {
		// Logging all arguments for debugging
		console.log('[Blockchain] saveMatchToBlockchain queued:', {
			tournamentId,
			gameId,
			gameIndex,
			playerLeft,
			playerRight,
			scoreLeft,
			scoreRight
		});

		// Send transaction - NonceManager handles nonce sequencing automatically
		const tx = await contract!.saveMatch(
			tournamentId,
			gameId,
			gameIndex,
			playerLeft,
			playerRight,
			scoreLeft,
			scoreRight
		);
		
		console.log(`[Blockchain] Transaction sent: ${tx.hash}`);
		return tx.hash;
	});
}
