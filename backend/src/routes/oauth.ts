// enables remote authentication with GitHub

import type { FastifyInstance, FastifyReply } from "fastify";
import crypto from "node:crypto";
import db from "../database/db_init.js";
import { createSessionToken, makeSessionCookie } from "../auth/session.js";
import { getUsernameDB } from "../database/users/getters.js";

// OAuth config from .env
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI; // exact callback URL registered in the GitHub app

// setting a cookie to make sure the browser that starts the GitHub login is the same browser that finishes it
// -> prevent CSRF attacks and login hijacking
// Flow: 
// 1. User clicks "Login with GitHub" button
// 2. Browser sends request to backend to start OAuth flow
// 3. Backend sets a cookie with a random value
// 4. Browser redirects to GitHub login page
// 5. User logs in to GitHub
// 6. GitHub redirects back to the backend with the code and state
// 7. Backend verifies the state cookie and exchanges the code for an access token
// 8. Backend creates a session and redirects to the frontend
// 9. Browser sends request to backend to finish OAuth flow
// - SameSite=Lax: allows the cookie on the OAuth redirect back, blocks most CSRF
// - Max-Age=600: expires in 10 minutes
// - Path=/ : cookie is valid for the whole site
function setStateCookie(reply: FastifyReply, state: string) {
	const cookie = [
		`oauth_state=${state}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		"Max-Age=600",
	].join("; ");
	reply.header("Set-Cookie", cookie);
}

// breaks the cookie header into individual key=value pairs
function readCookie(header: string | undefined, name: string): string | undefined {
	if (!header)
		return undefined; // OAuth attempt will be rejected and the user must try again
	const pairs = header.split(";"); // browser sends cookie header e.g.: "sid=abc123; oauth_state=XYZ789"
	// loop over each cookie key=value string in the pairs array
	for (const pair of pairs) {
		const trimmed = pair.trim();
		if (!trimmed) continue; // if the chunk is empty after trimming, skip it

		const equal_index = trimmed.indexOf("="); // find the index of the equal sign
		if (equal_index === -1) continue; // if no equal sign is found, skip it

		const key = trimmed.slice(0, equal_index); // key (left of the equal sign)
		const value = trimmed.slice(equal_index + 1); // value (right of the equal sign)

		if (key === name) return value;
	}
	return undefined;
}

export default async function oauthRoutes(fastify: FastifyInstance) {
	// START: Redirect user-agent to GitHub authorization page
	fastify.get("/api/auth/github/start", async (_req, reply) => {
		// Basic env validation (keeps code simple and explicit)
		if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_REDIRECT_URI) {
			return reply
				.code(500)
				.send({ success: false, message: "GitHub OAuth not configured" });
		}
		const state = crypto.randomUUID();
		setStateCookie(reply, state);

		const url = new URL("https://github.com/login/oauth/authorize");
		url.searchParams.set("client_id", GITHUB_CLIENT_ID);
		url.searchParams.set("redirect_uri", GITHUB_REDIRECT_URI);
		url.searchParams.set("scope", "read:user user:email");
		url.searchParams.set("state", state);
		reply.redirect(url.toString());
	});

	// CALLBACK: Exchange code, fetch profile, upsert user, set cookie, redirect
	fastify.get("/api/auth/github/callback", async (req, reply) => {
		const { code, state } = (req.query ?? {}) as {
			code?: string;
			state?: string;
		};

		const expected = readCookie(req.headers.cookie, "oauth_state");
		if (!code || !state || !expected || state !== expected) {
			return reply.code(400).send({ success: false, message: "Invalid OAuth state" });
		}

		// Exchange the code for an access token
		const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				client_id: GITHUB_CLIENT_ID,
				client_secret: GITHUB_CLIENT_SECRET,
				code,
				redirect_uri: GITHUB_REDIRECT_URI,
			}),
		});
		const tokenBody = (await tokenRes.json()) as { access_token?: string };
		if (!tokenBody.access_token) {
			return reply.code(400).send({ success: false, message: "OAuth token exchange failed" });
		}

		// Fetch the GitHub profile
		const profRes = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${tokenBody.access_token}`,
				Accept: "application/vnd.github+json",
				"User-Agent": "ft_transcendence",
			},
		});
		const prof = (await profRes.json()) as {
			id: number;
			login: string;
			avatar_url?: string;
		};
		const providerId = String(prof.id);

		// Check if we already have this GitHub user
		const existing = db
			.prepare(
				`SELECT username FROM users WHERE provider = 'github' AND provider_id = ? LIMIT 1`
			)
			.get(providerId) as { username: string } | undefined;

		let username = existing?.username;

		// If new, create a separate account (no linking to local accounts)
		if (!username) {
			// Start from GitHub login; ensure uniqueness
			let candidate = prof.login;
			if (getUsernameDB(candidate)) {
				candidate = `${candidate}_${Math.floor(Math.random() * 10000)}`;
			}

			// Store a placeholder password (not used for OAuth accounts)
			const placeholderPassword = crypto.randomBytes(32).toString("hex");

			const result = db
				.prepare(
					`
					INSERT INTO users (username, password, provider, provider_id, avatar)
					VALUES (?, ?, 'github', ?, ?)
				`
				)
				.run(candidate, placeholderPassword, providerId, prof.avatar_url || null);
			if (result.changes === 0)
				return reply
					.code(400)
					.send({ success: false, message: "Unable to create user" });

			username = candidate;
		}

		// Create session and redirect to frontend
		const { token, maxAgeSec } = createSessionToken(username, 60);
		const secure = process.env.NODE_ENV === "production"; // only set Secure over HTTPS
		reply.header("Set-Cookie", makeSessionCookie(token, { secure, maxAgeSec }));
		if (!FRONTEND_ORIGIN) {
			return reply.code(500).send({ success: false, message: "FRONTEND_ORIGIN not configured" });
		}
		reply.redirect(`${FRONTEND_ORIGIN}/#/menu`);
	});
}


