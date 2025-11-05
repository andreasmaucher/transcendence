import { Contract, BrowserProvider } from "ethers";
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  CONTRACT_FUNCTION,
} from "../config/contract";

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
