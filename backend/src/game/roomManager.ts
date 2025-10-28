// global storage for all active game rooms
import type { Room } from "../types/game.js";
import { createInitialState } from "./state.js";
import db from "../database/db.js";                        //database integration

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
  // Log new match in SQLite
  try {
    const stmt = db.prepare(`
      INSERT INTO matches (room_id, started_at)
      VALUES (?, CURRENT_TIMESTAMP)
      `);
    stmt.run(id);
    console.log(`[db] Created new match record for room ${id}`);
  } catch (err) {
    console.error(`[db] Failed to insert match for room ${id}:`, err);
  }
  return room;
}

export function forEachRoom(fn: (room: Room) => void): void {
  for (const room of rooms.values()) fn(room);
}

