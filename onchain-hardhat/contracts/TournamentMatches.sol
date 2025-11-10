// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TournamentMatches - Minimal registry to store finished games for a tournament
/// @notice Stores the minimal information you requested per game:
/// - tournament identifier (string)
/// - game identifier (string)
/// - which game in the tournament (index)
/// - usernames for left/right players (strings)
/// - final score (left/right)
/// Additionally records the reporter address and a timestamp.
contract TournamentMatches {
    struct Game {
        string tournamentId;
        string gameId;
        uint32 gameIndex; // e.g., bracket index or sequence number
        string leftUsername;
        string rightUsername;
        uint8 scoreLeft;
        uint8 scoreRight;
        address reporter; // tx sender who saved the game
        uint64 savedAt; // block.timestamp when saved
    }

    /// @dev Keyed by keccak256(abi.encodePacked(tournamentId, "|", gameId))
    mapping(bytes32 => Game) private games;

    event GameSaved(
        bytes32 indexed key,
        string tournamentId,
        string gameId,
        uint32 gameIndex,
        string leftUsername,
        string rightUsername,
        uint8 scoreLeft,
        uint8 scoreRight,
        address indexed reporter,
        uint256 timestamp
    );

    /// @notice Compute the storage key for a (tournamentId, gameId) pair
    function computeKey(
        string memory tournamentId,
        string memory gameId
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(tournamentId, "|", gameId));
    }

    /// @notice Save a finished match. Reverts if the (tournamentId, gameId) already exists.
    /// @dev Signature matches the frontend placeholder ABI:
    /// function saveMatch(string,string,uint256,string,string,uint8,uint8)
    function saveMatch(
        string memory tournamentId,
        string memory gameId,
        uint256 gameIndex, // accepted as uint256 for ABI convenience, stored as uint32
        string memory playerLeft,
        string memory playerRight,
        uint8 scoreLeft,
        uint8 scoreRight
    ) external {
        bytes32 key = computeKey(tournamentId, gameId);
        // Prevent overwriting an existing record
        require(bytes(games[key].gameId).length == 0, "game already saved");

        games[key] = Game({
            tournamentId: tournamentId,
            gameId: gameId,
            gameIndex: uint32(gameIndex),
            leftUsername: playerLeft,
            rightUsername: playerRight,
            scoreLeft: scoreLeft,
            scoreRight: scoreRight,
            reporter: msg.sender,
            savedAt: uint64(block.timestamp)
        });

        emit GameSaved(
            key,
            tournamentId,
            gameId,
            uint32(gameIndex),
            playerLeft,
            playerRight,
            scoreLeft,
            scoreRight,
            msg.sender,
            block.timestamp
        );
    }

    /// @notice Check if a game has already been saved
    function exists(
        string memory tournamentId,
        string memory gameId
    ) external view returns (bool) {
        bytes32 key = computeKey(tournamentId, gameId);
        return bytes(games[key].gameId).length != 0;
    }

    /// @notice Get a saved game by tournamentId and gameId
    function getGame(
        string memory tournamentId,
        string memory gameId
    )
        external
        view
        returns (
            string memory _tournamentId,
            string memory _gameId,
            uint32 _gameIndex,
            string memory _leftUsername,
            string memory _rightUsername,
            uint8 _scoreLeft,
            uint8 _scoreRight,
            address _reporter,
            uint64 _savedAt
        )
    {
        bytes32 key = computeKey(tournamentId, gameId);
        Game storage g = games[key];
        require(bytes(g.gameId).length != 0, "game not found");
        return (
            g.tournamentId,
            g.gameId,
            g.gameIndex,
            g.leftUsername,
            g.rightUsername,
            g.scoreLeft,
            g.scoreRight,
            g.reporter,
            g.savedAt
        );
    }
}
