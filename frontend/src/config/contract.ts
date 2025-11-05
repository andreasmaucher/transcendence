// Contract configuration placeholders.
// Replace VITE_CONTRACT_ADDRESS in your .env (Vite) and adjust ABI/function as needed.

export const CONTRACT_ADDRESS: string =
  (import.meta as any).env?.VITE_CONTRACT_ADDRESS || "";

// Default function name we expect to call. Adjust when integrating the real contract.
export const CONTRACT_FUNCTION = "saveMatch" as const;

// Minimal ABI for a typical saveMatch call. Update to the real ABI later.
// function saveMatch(
//   string tournamentId,
//   string gameId,
//   uint256 gameIndex,
//   string playerLeft,
//   string playerRight,
//   uint8 scoreLeft,
//   uint8 scoreRight
// ) external;
export const CONTRACT_ABI = [
  "function saveMatch(string,string,uint256,string,string,uint8,uint8) external",
  "function getGame(string,string) view returns (string,string,uint32,string,string,uint8,uint8,address,uint64)",
  "function exists(string,string) view returns (bool)",
];
