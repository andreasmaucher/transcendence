import fs from "fs";
import { ethers } from "ethers";

// Read private key from Docker secret (if present)
function readSecret(path: string): string | undefined {
	try {
		return fs.readFileSync(path, "utf8").trim();
	} catch {
		return undefined;
	}
}

const privateKeyFromSecret = readSecret("/run/secrets/chain_private_key");

// Resolve config from env
const RPC_URL = process.env.RPC_URL || process.env.FUJI_RPC_URL || process.env.AVALANCHE_FUJI_RPC_URL;

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || process.env.VITE_CONTRACT_ADDRESS;

const PRIVATE_KEY = process.env.CHAIN_PRIVATE_KEY || privateKeyFromSecret;

// Export flag so routes can check if blockchain is usable
export const isBlockchainConfigured = Boolean(RPC_URL && CONTRACT_ADDRESS && PRIVATE_KEY);

if (!isBlockchainConfigured) {
	console.warn("[BLOCKCHAIN] config missing: RPC_URL / CONTRACT_ADDRESS / PRIVATE_KEY — on-chain writes disabled");
}

// ABI (same as frontend wallet config)
const CONTRACT_ABI = [
	"function saveMatch(string,string,uint256,string,string,uint8,uint8) external",
	"function getGame(string,string) view returns (string,string,uint32,string,string,uint8,uint8,address,uint64)",
	"function exists(string,string) view returns (bool)",
];

// Provider / signer / contract only if fully configured
export const provider = isBlockchainConfigured ? new ethers.JsonRpcProvider(RPC_URL!) : undefined;

export const signer = isBlockchainConfigured && provider ? new ethers.Wallet(PRIVATE_KEY!, provider) : undefined;

export const matchContract =
	isBlockchainConfigured && signer ? new ethers.Contract(CONTRACT_ADDRESS!, CONTRACT_ABI, signer) : undefined;

// Called by routes (e.g. /api/blockchain/local-game)
export async function saveMatchOnChain(params: {
	player1: string;
	player2: string;
	timestamp: bigint | number;
	mode: string;
	winner: string;
	score1: number;
	score2: number;
}) {
	if (!isBlockchainConfigured || !matchContract) {
		throw new Error("BLOCKCHAIN_NOT_CONFIGURED");
	}

	const { player1, player2, timestamp, mode, winner, score1, score2 } = params;

	const tx = await matchContract.saveMatch(player1, player2, timestamp, mode, winner, score1, score2);

	const receipt = await tx.wait();
	return receipt;
}
