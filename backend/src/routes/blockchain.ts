import fs from "fs";
import { ethers } from "ethers";
import type { FastifyInstance } from "fastify";

export default async function blockchainRoutes(_fastify: FastifyInstance) {
	// Intentionally empty: route wiring can be added when needed.
}

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

const baseSigner = isBlockchainConfigured && provider ? new ethers.Wallet(PRIVATE_KEY!, provider) : undefined;

// NonceManager prevents nonce collisions when multiple requests send txs concurrently
export const signer = isBlockchainConfigured && baseSigner ? new ethers.NonceManager(baseSigner) : undefined;

export const matchContract =
	isBlockchainConfigured && signer ? new ethers.Contract(CONTRACT_ADDRESS!, CONTRACT_ABI, signer) : undefined;

// Called by routes (e.g. /api/blockchain/local-game)
// This mirrors the on-chain contract signature:
// saveMatch(string tournamentId, string gameId, uint256 gameIndex,
//           string playerLeft, string playerRight, uint8 scoreLeft, uint8 scoreRight)
export async function saveMatchOnChain(params: {
	tournamentId: string;
	gameId: string;
	gameIndex: bigint | number;
	playerLeft: string;
	playerRight: string;
	scoreLeft: number;
	scoreRight: number;
}) {
	if (!isBlockchainConfigured || !matchContract) {
		throw new Error("BLOCKCHAIN_NOT_CONFIGURED");
	}

	const { tournamentId, gameId, gameIndex, playerLeft, playerRight, scoreLeft, scoreRight } = params;

	const tx = await matchContract.saveMatch(
		tournamentId,
		gameId,
		gameIndex,
		playerLeft,
		playerRight,
		scoreLeft,
		scoreRight
	);

	const receipt = await tx.wait();
	return receipt;
}
