import { RawData, WebSocket } from "ws";
import type { FastifyInstance } from "fastify";
import type { PaddleSide } from "../types/game.js";
import { getOrCreateRoom } from "../game/roomManager.js";
import { buildStatePayload } from "./broadcaster.js";
import { GAME_CONSTANTS } from "../config/constants.js";

export function registerWebsocketRoute(fastify: FastifyInstance) {
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
      const room = getOrCreateRoom(roomId);
      room.clients.add(socket);
      console.log(
        `[client] room=${room.id} event=join ip=${request.ip} clients=${room.clients.size}`
      );
      const payload = JSON.stringify(buildStatePayload(room));
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
          room.inputs[message.paddle] = input;
        } else if (message.type === "reset") {
          room.state = {
            ...room.state,
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
          room.inputs = { left: 0, right: 0 };
          console.log(`[game] room=${room.id} event=reset`);
        }
      });

      socket.on("close", () => {
        room.clients.delete(socket);
        console.log(
          `[client] room=${room.id} event=leave ip=${request.ip} clients=${room.clients.size}`
        );
      });
    }
  );
}

