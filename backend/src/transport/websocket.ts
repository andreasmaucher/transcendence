import { RawData, WebSocket } from "ws";
import type { FastifyInstance } from "fastify";
import type { PaddleSide, Tournament, Match } from "../types/game.js";
import { getOrCreateTournament } from "../game/tournamentManager.js";
import { buildStatePayload, broadcast } from "./broadcaster.js";
import { GAME_CONSTANTS } from "../config/constants.js";

export function registerWebsocketRoute(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>(
    "/api/rooms/:id/ws",
    { websocket: true },
    (socket, request) => {
      const roomId = request.params.id;
      if (!roomId) {
        socket.close(1011, "room id missing");
        return;
      }

      console.log(`[ws] connect roomId=${roomId}`);
      const tournament = getOrCreateTournament(roomId);

      // For now, just use the first match
      const match: Match = tournament.matches[0];
      match.clients.add(socket);

      console.log(
        `[client] match=${match.id} joined (${match.clients.size} total)`
      );

      // ▶ send initial state
      socket.send(JSON.stringify(buildStatePayload(match)));

      // 🕹 handle messages
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

      // 💨 cleanup on close
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


/* export function registerWebsocketRoute(fastify: FastifyInstance) { // hardcoded first match of the tournament for now
  fastify.get<{ Params: { id: string } }>(
    "/api/rooms/:id/ws",
    { websocket: true },
    (socket, request) => {
      const roomId = request.params.id;
      if (!roomId) {
        try {
          socket.close(1011, "room id missing");
        } catch {}
        return;
      }
      console.log(`[TEST] Inside websocket for id: ${roomId}`);
      const tournament = getOrCreateTournament(roomId);
      const match = tournament.matches[0];                          // hardcoded first match of the tournament for now
      match.clients.add(socket);
      console.log(
        `[client] room=${tournament.id} event=join ip=${request.ip} clients=${match.clients.size}`
      );
      const payload = JSON.stringify(buildStatePayload(match));
      socket.send(payload, (err) => {
        if (err) {
          request.log.error({ err }, "initial payload send failed");
        }
      });

      socket.on("message", (raw: RawData) => {
        let parsed: unknown;
        try {
          const text = typeof raw === "string" ? raw : raw.toString();
          parsed = JSON.parse(text);
        } catch {
          return;
        }
        if (!parsed || typeof parsed !== "object") return;
        const message = parsed as
          | { type: "input"; paddle: PaddleSide; direction: "up" | "down" | "stop" }
          | { type: "reset" };
        if (message.type === "input") {
          const input =
            message.direction === "up" ? -1 : message.direction === "down" ? 1 : 0;
          match.inputs[message.paddle] = input;
        } else if (message.type === "reset") {
          match.state = {
            ...match.state,
            // reset using constants
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
          match.inputs = { left: 0, right: 0 };                                  // hardcoded first match of the tournament for now
          console.log(`[game] room=${match.id} event=reset`);
        }
      });

      socket.on("close", () => {
        match.clients.delete(socket);                                           // hardcoded first match of the tournament for now
        console.log(
          `[client] room=${match.id} event=leave ip=${request.ip} clients=${match.clients.size}`         // hardcoded first match of the tournament for now
        );
      });
    }
  );
}

 */