// src/api/http.ts
import { API_BASE } from "../config/endpoints";
import type { GameConstants } from "../constants";

// -json helper get
async function getJSON<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    credentials: opts.credentials ?? "include",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: any = new Error(json?.message || `GET ${url} failed`);
    err.status = res.status;
    throw err;
  }

  return json as T;
}

// json helper post
async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: any = new Error(json?.message || `POST ${url} failed`);
    err.status = res.status;
    throw err;
  }

  return json as T;
}

export { postJSON };

// the game
export async function fetchGameConstants(): Promise<GameConstants> {
  return await getJSON<GameConstants>(`${API_BASE}/api/constants`, {
    credentials: "omit",
  });
}

// auth fetch
export type User = {
  id: number;
  username: string;
  avatar: string | null;
  created_at: string;
};

export async function fetchMe(): Promise<User | null> {
  try {
    const me: any = await getJSON(`${API_BASE}/api/user/me`);

    if (
      me &&
      typeof me.id === "number" &&
      typeof me.username === "string" &&
      typeof me.created_at === "string"
    ) {
      return me as User;
    }

    return null;
  } catch (err: any) {
    if (err.status === 401) return null;
    return null;
  }
}

// auth
export async function registerUser(params: {
  username: string;
  password: string;
}): Promise<void> {
  await postJSON(`${API_BASE}/api/user/register`, params);
}

export async function loginUser(params: {
  username: string;
  password: string;
}): Promise<void> {
  await postJSON(`${API_BASE}/api/user/login`, params);
}

export async function logout(): Promise<void> {
  await postJSON(`${API_BASE}/api/user/logout`, {});
}
