import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getAllTournamentsDB, getTournamentByIdDB } from "../database/tournaments/getters.js";
import { getOpenTournaments, getTournament, isTournamentOpen, initTournamentMatches } from "../managers/tournamentManagerHelpers.js";
import { Tournament } from "../types/game.js";
import { tournaments } from "../config/structures.js";
import { createInitialTournamentState } from "../game/state.js";
import { checkTournamentFull } from "../managers/tournamentManagerHelpers.js";
import { removeTournamentDB } from "../database/tournaments/setters.js";
import db from "../database/db_init.js";

export default async function tournamentRoutes(fastify: FastifyInstance) {
	// ROUTES FOR MULTIPLE TOURNAMENTS
	// GET all tournaments in the database
	fastify.get("/api/tournaments/all", async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			const tournaments = getAllTournamentsDB();
			return reply.code(200).send({ success: true, data: tournaments });
		} catch (error: any) {
			console.error("[tournamentRT]", error.message);
			return reply.code(500).send({ success: false, message: "Unable to retrieve tournaments" });
		}
	});

	// GET all open tournaments
	fastify.get("/api/tournaments/open", async (_request: FastifyRequest, reply: FastifyReply) => {
		// ANDY: added this to load tournaments from database into memory so they're visible to all users
		// Also include tournaments that are in memory but might not be in DB yet (just created)
		try {
			const dbTournaments = db.prepare(`
				SELECT id, name, size
				FROM tournaments
				WHERE started_at IS NULL
			`).all() as Array<{ id: string; name: string; size: number }>;

			for (const dbTournament of dbTournaments) {
				if (!tournaments.has(dbTournament.id)) {
					// Tournament exists in DB but not in memory - load it
					const tournament: Tournament = {
						id: dbTournament.id,
						name: dbTournament.name,
						state: createInitialTournamentState(dbTournament.size || 4),
						matches: new Map(),
						players: [],
					};

					// Initialize matches for the tournament
					const matches = initTournamentMatches(tournament, tournament.state.size);
					tournament.matches.set(1, matches);

					// Set timer to wait for players
					tournament.expirationTimer = setTimeout(
						(tournament: Tournament) => {
							if (!checkTournamentFull(tournament)) {
								console.log(`[WS] Tournament ${tournament.id} expired — not enough players joined`);
								removeTournamentDB(tournament.id);
								tournament.matches.clear();
								tournaments.delete(tournament.id);
							}
						},
						5 * 60 * 1000,
						tournament
					);

					tournaments.set(dbTournament.id, tournament);
				}
			}
		} catch (error: any) {
			console.error("[tournamentRT] Error loading tournaments from database:", error.message);
		}

		const openTournaments: Tournament[] = getOpenTournaments();
		if (openTournaments.length === 0) console.error("[tournamentRT] No open tournaments");
		// Sanitize: remove non-serializable fields like 'clients' (Set<WebSocket>) before returning to avoid JSON.stringify errors
		const data = openTournaments.map((t) => ({
			id: t.id,
			name: t.name,
			state: t.state,
			players: t.players.map((p) => ({
				username: p.username,
				displayName: p.displayName,
			})),
			// count players in first round matches to show in the lobby player x of 4 have joined already
			playersJoined: (() => {
				const round1Matches = t.matches.get(1);
				if (!round1Matches) return 0;
				let count = 0;
				for (const match of round1Matches) {
					if (match.players.left) count++;
					if (match.players.right) count++;
				}
				return count;
			})(),
		}));
		return reply.code(200).send({ success: true, data });
	});

	// ROUTES FOR ONE TOURNAMENT ONLY
	// GET a tournament by id
	fastify.get("/api/tournament/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		const { id } = request.params as { id: string };

		try {
			const tournament = getTournamentByIdDB(id);
			return reply.code(200).send({ success: true, data: tournament });
		} catch (error: any) {
			console.error("[tournamentRT]", error.message);
			return reply.code(404).send({ success: false, message: "Tournament not found" });
		}
	});
	// CHECK if tournament is open
	fastify.get("/api/tournament/is-open/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		const { id } = request.params as { id: string };
		try {
			const tournament = getTournament(id);
			if (!tournament) return reply.code(200).send({ success: true, open: false });
			const open = isTournamentOpen(tournament);
			return reply.code(200).send({ success: true, open: open });
		} catch (error: any) {
			console.error("[tournamentRT]", error.message);
			return reply.code(400).send({ success: false, message: "Unable to check the tournament" });
		}
	});
}
