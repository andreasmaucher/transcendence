import { Contract, BrowserProvider, JsonRpcProvider } from "ethers";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  CONTRACT_FUNCTION,
} from "../config/contract";
import { VITE_FUJI_RPC_URL } from "./wallet";

export type MatchSaveParams = {
  tournamentId: string;
  gameId: string;
  gameIndex: number; // 0-based index in tournament bracket/sequence
  playerLeft: string;
  playerRight: string;
  scoreLeft: number;
  scoreRight: number;
};

/**
 * Save a finished match to the configured smart contract.
 * Throws if contract address is not configured or transaction fails.
 * Returns the transaction hash on success.
 */
export async function saveMatchOnChain(
  provider: BrowserProvider,
  params: MatchSaveParams
): Promise<string> {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "Contract address not configured. Set VITE_CONTRACT_ADDRESS in your environment."
    );
  }

  const signer = await provider.getSigner();
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  // Map to positional args as declared in CONTRACT_ABI order
  const args: [string, string, bigint, string, string, number, number] = [
    params.tournamentId,
    params.gameId,
    BigInt(params.gameIndex),
    params.playerLeft,
    params.playerRight,
    params.scoreLeft,
    params.scoreRight,
  ];

  // Using bracket syntax to allow swapping function name later without changing code.
  const tx = await (contract as any)[CONTRACT_FUNCTION](...args);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx?.hash ?? "";
}

export type SavedMatch = {
  tournamentId: string;
  gameId: string;
  gameIndex: number;
  leftUsername: string;
  rightUsername: string;
  scoreLeft: number;
  scoreRight: number;
  reporter: string;
  savedAt: number;
};

/**
 * Read a saved match back from the chain using getGame(tournamentId, gameId).
 * If a BrowserProvider isn't available, falls back to a public JsonRpcProvider on Fuji.
 */
export async function fetchSavedMatch(
  provider: BrowserProvider | null,
  tournamentId: string,
  gameId: string
): Promise<SavedMatch> {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "Contract address not configured. Set VITE_CONTRACT_ADDRESS in your environment."
    );
  }
  const readProv = provider ?? new JsonRpcProvider(VITE_FUJI_RPC_URL);
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProv);
  const res = await (contract as any)["getGame"](tournamentId, gameId);
  return {
    tournamentId: res[0],
    gameId: res[1],
    gameIndex: Number(res[2]),
    leftUsername: res[3],
    rightUsername: res[4],
    scoreLeft: Number(res[5]),
    scoreRight: Number(res[6]),
    reporter: res[7],
    savedAt: Number(res[8]),
  };
}
