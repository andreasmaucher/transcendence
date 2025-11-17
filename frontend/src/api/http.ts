// src/api/http.ts
import { API_BASE } from "../config/endpoints";
import type { GameConstants } from "../constants";

// helpers

async function getJSON<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    credentials: opts.credentials ?? "include",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `GET ${url} failed`);

  return json as T;
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || `POST ${url} failed`);
  }

  return json as T;
}

export { postJSON }; 

export async function fetchGameConstants(): Promise<GameConstants> {
  return await getJSON<GameConstants>(`${API_BASE}/api/constants`, {
    credentials: "omit",
  });
}

// auth

export async function fetchMe(): Promise<{
  id: number;
  username: string;
  avatar: string | null;
  created_at: string;
} | null> {
  try {
    const data = await getJSON<{ data?: any }>(`${API_BASE}/api/user/me`);
    return data?.data ?? null;
  } catch (err: any) {
    if (String(err.message).includes("401")) return null;
    return null; // 
  }
}

// auth mutating endpoints
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

export async function updateUser(params: {
	username: string;
	newUsername?: string;
	newPassword?: string;
	newAvatar?: string;
}): Promise<void> {
	const res = await fetch(`${API_BASE}/api/user/update`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify(params),
	});

	const text = await res.text();
	let message = "update failed";

	try {
		const body = JSON.parse(text);
		if (!res.ok || body?.success === false) {
			message = body?.message || message;
			throw new Error(message);
		}
	} catch (err) {
		if (!res.ok) {
			throw new Error(message);
		}
	}
}


// tournament

export type Tournament = {
  id: number;
  name: string;
  status: string;
};



////////// HARDCODED ##### TEMPORARY
export async function fetchTournamentList(): Promise<Tournament[]> {
  const res = await fetch(`${API_BASE}/api/tournament/list`, {
    credentials: "include",
  });

  if (res.status === 404) {
    // hardcoded tournoments *******************************
    return [
      { id: 1, name: "42 League", status: "open" },
      { id: 2, name: "Berlin", status: "open" },
    ];
  }

  if (!res.ok) {
    throw new Error("Failed to fetch tournament list");
  }

  const body = await res.json();
  return (body.data as Tournament[]) ?? [];
}
