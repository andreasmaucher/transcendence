import { API_BASE } from "../config/endpoints";
import type { GameConstants } from "../constants";

export async function fetchGameConstants(): Promise<GameConstants> {
  const res = await fetch(`${API_BASE}/api/constants`, { credentials: "omit" });
  if (!res.ok) throw new Error("constants fetch failed");
  const data = await res.json();
  return data as GameConstants;
}

