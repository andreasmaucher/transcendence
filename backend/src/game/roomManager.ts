// global storage for all active game rooms
import type { Room } from "../types/game.js";
import { createInitialState } from "./state.js";

const rooms = new Map<string, Room>();

export function resetRoomsForTest(): void {
  rooms.clear();
}

export function getOrCreateRoom(id: string): Room {
  let room = rooms.get(id);
  if (!room) {
    room = {
      id,
      state: createInitialState(),
      inputs: { left: 0, right: 0 },
      clients: new Set(),
    } as Room;
    rooms.set(id, room);
  }
  return room;
}

export function forEachRoom(fn: (room: Room) => void): void {
  for (const room of rooms.values()) fn(room);
}

