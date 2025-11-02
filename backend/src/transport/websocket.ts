import { RawData } from "ws";
import type { FastifyInstance } from "fastify";
import type { PaddleSide, Match } from "../types/game.js";
import { getOrCreateTournament } from "../game/tournamentManager.js";
import { buildStatePayload, broadcast } from "./broadcaster.js";
import { GAME_CONSTANTS } from "../config/constants.js";
import { parseCookies, verifySessionToken } from "../auth/session.js";

export function registerWebsocketRoute(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>(
    "/api/tournaments/:id/ws",
    { websocket: true },
    (socket, request) => {
      // Check session: requires a valid 'sid' cookie
      const cookies = parseCookies(request.headers.cookie);
      const sid = cookies["sid"];
      const payload = verifySessionToken(sid);
      if (!payload) {
        try {
          socket.close(4401, "unauthorized");
        } catch {}
        return;
      }

      const tournamentId = request.params.id;
      if (!tournamentId) {
        socket.close(1011, "tournament id missing");
        return;
      }
      console.log(`[ws] connect tournamentId=${tournamentId}`);

      // Retrieve or create tournament
      const tournament = getOrCreateTournament(tournamentId);

      // Choose which match
      const match: Match = tournament.matches[0];                                  // hardcoded first match of the tournament for now
      // Attach user id on the socket for possible future use (e.g., match attribution)
      (socket as any).userId = payload.userId;
      match.clients.add(socket);

      console.log(
        `[client] match=${match.id} joined (${match.clients.size} total)`
      );

      // Send initial state
      socket.send(JSON.stringify(buildStatePayload(match)));

      // Handle messages
      socket.on("message", (raw: RawData) => {
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }

        if (msg.type === "input") {
          const dir = msg.direction === "up" ? -1 : msg.direction === "down" ? 1 : 0;
          match.inputs[msg.paddle as PaddleSide] = dir;
        } else if (msg.type === "reset") {
          match.state = {
            ...match.state,
            width: GAME_CONSTANTS.FIELD_WIDTH,
            height: GAME_CONSTANTS.FIELD_HEIGHT,
            paddles: {
              left: { y: (GAME_CONSTANTS.FIELD_HEIGHT - GAME_CONSTANTS.PADDLE_HEIGHT) / 2 },
              right: { y: (GAME_CONSTANTS.FIELD_HEIGHT - GAME_CONSTANTS.PADDLE_HEIGHT) / 2 },
            },
            ball: {
              x: GAME_CONSTANTS.FIELD_WIDTH / 2,
              y: GAME_CONSTANTS.FIELD_HEIGHT / 2,
              vx: GAME_CONSTANTS.BALL_SPEED,
              vy: GAME_CONSTANTS.BALL_SPEED * GAME_CONSTANTS.INITIAL_BALL_VY_RATIO,
              r: GAME_CONSTANTS.BALL_RADIUS,
            },
            score: { left: 0, right: 0 },
            tick: 0,
            gameOver: false,
            winner: null,
            winningScore: GAME_CONSTANTS.WINNING_SCORE,
          };
          match.inputs = { left: 0, right: 0 };
          console.log(`[game] match=${match.id} reset`);
          broadcast(match);
        }
      });

      // Cleanup on close
      socket.on("close", () => {
        match.clients.delete(socket);
        console.log(
          `[client] match=${match.id} left (${match.clients.size} remaining)`
        );
      });

      socket.on("error", (err) => {
        console.error(`[ws error] match=${match.id}`, err);
      });
    }
  );
}
