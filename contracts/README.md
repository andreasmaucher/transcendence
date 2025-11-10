# TournamentMatches.sol

A minimal Solidity contract to store results for each game of a tournament.

What it stores per game

- tournamentId (string)
- gameId (string)
- gameIndex (uint32) — which game in the tournament (bracket or sequence index)
- leftUsername (string)
- rightUsername (string)
- scoreLeft (uint8)
- scoreRight (uint8)
- reporter (address) — msg.sender who saved it
- savedAt (uint64) — block timestamp

Key points

- Primary key = keccak256(abi.encodePacked(tournamentId, "|", gameId))
- saveMatch reverts if the same (tournamentId, gameId) has already been saved
- Emits GameSaved event

Functions

- saveMatch(string tournamentId, string gameId, uint256 gameIndex, string playerLeft, string playerRight, uint8 scoreLeft, uint8 scoreRight)
- exists(string tournamentId, string gameId) → bool
- getGame(string tournamentId, string gameId) → full tuple of stored fields
- computeKey(string tournamentId, string gameId) → bytes32

ABI fragment (for ethers.js)

```json
[
  "function saveMatch(string,string,uint256,string,string,uint8,uint8)",
  "function exists(string,string) view returns (bool)",
  "function computeKey(string,string) pure returns (bytes32)",
  "function getGame(string,string) view returns (string,string,uint32,string,string,uint8,uint8,address,uint64)",
  "event GameSaved(bytes32 indexed key, string tournamentId, string gameId, uint32 gameIndex, string leftUsername, string rightUsername, uint8 scoreLeft, uint8 scoreRight, address indexed reporter, uint256 timestamp)"
]
```

Compile/Deploy

- With Foundry
  - Add to a Foundry project (forge init), drop `contracts/TournamentMatches.sol`, then `forge build` and `forge create`.
- With Hardhat
  - Create a Hardhat project, place the contract under `contracts/`, run `npx hardhat compile`, deploy with a simple script.

Frontend alignment

- The frontend placeholder ABI in `frontend/src/config/contract.ts` already matches `saveMatch`.
- Set `VITE_CONTRACT_ADDRESS` to the deployed contract address to enable saving.

RPC provider endpoint:
https://eth-mainnet.g.alchemy.com/v2/4fm0eDpMYhHcO9B21giZc
