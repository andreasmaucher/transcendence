import { describe, expect, test, beforeEach } from "vitest";
import {
  getOrCreateRoom,
  buildStatePayload,
  broadcast,
  resetRoomsForTest,
} from "../src/server.js";

class StubSocket {
  messages: string[] = [];
  readyState = 1; // OPEN

  send(payload: string) {
    this.messages.push(payload);
  }

  close() {
    this.readyState = 3; // CLOSED
  }
}

beforeEach(() => {
  resetRoomsForTest();
});

describe("room management", () => {
  test("returns same instance for same room id", () => {
    const a = getOrCreateRoom("alpha");
    const b = getOrCreateRoom("alpha");
    expect(a).toBe(b);
  });

  test("creates fresh room state", () => {
    const room = getOrCreateRoom("fresh");
    const payload = buildStatePayload(room);
    expect(payload.type).toBe("state");
    expect(payload.score.left).toBe(0);
    expect(payload.score.right).toBe(0);
    expect(payload.paddles.left?.y).toBeDefined();
    expect(payload.paddles.right?.y).toBeDefined();
  });
});

describe("broadcast", () => {
  test("sends latest state to connected sockets", () => {
    const room = getOrCreateRoom("stream");
    const socket = new StubSocket();
    // @ts-expect-error using stub socket for tests
    room.clients.add(socket);
    broadcast(room);
    expect(socket.messages).toHaveLength(1);
    const message = JSON.parse(socket.messages[0]);
    expect(message.type).toBe("state");
    expect(message.score.left).toBe(0);
  });
});
