// http client for fetching game constants from the backend
// Builds the URL from API_BASE and calls /api/constants via fetch(), without cookies (credentials: "omit")
// API_BASE is the base URL for the backend HTTP API e.g. if you open http://localhost:5173/, API_BASE = http://localhost:4000

import { API_BASE } from "../config/endpoints";
import type { GameConstants } from "../constants";

export async function fetchGameConstants(): Promise<GameConstants> {
  const res = await fetch(`${API_BASE}/api/constants`, { credentials: "omit" });
  if (!res.ok) throw new Error("constants fetch failed");
  const data = await res.json();
  return data as GameConstants;
}

