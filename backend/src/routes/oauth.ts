// Enable remote authentication with GitHub

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { createSessionToken, makeSessionCookie } from "../auth/session.js";
import { getGithubUserByProviderIdDB, getUsernameDB } from "../database/users/getters.js";
import { registerGithubUserDB } from "../database/users/setters.js";
import { readCookie, setStateCookie } from "../auth/oauth.js";

// OAuth config from .env
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI; // exact callback URL registered in the GitHub app

export default async function oauthRoutes(fastify: FastifyInstance) {
	fastify.get("/api/auth/github/start", async (_request: FastifyRequest, reply: FastifyReply) => {
		if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_REDIRECT_URI) {
			return reply.code(500).send({ success: false, message: "GitHub OAuth not configured in .env" });
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

	fastify.get("/api/auth/github/callback", async (request: FastifyRequest, reply: FastifyReply) => {
		const code = (request.query as any)?.code as string | undefined;
		const state = (request.query as any)?.state as string | undefined;

		const expected = readCookie(request.headers.cookie, "oauth_state");
		if (!code || !state || !expected || state !== expected) {
			return reply.code(400).send({ success: false, message: "Invalid OAuth state" });
		}

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

		const profRes = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${tokenBody.access_token}`,
				Accept: "application/vnd.github+json",
				"User-Agent": "ft_transcendence",
			},
		});

		const profile = (await profRes.json()) as {
			id: number;
			login: string;
			avatar_url?: string;
		};

		const providerId = String(profile.id);

		let username = getGithubUserByProviderIdDB(providerId);

		// create user if not found
		if (!username) {
			let candidate = profile.login;
			if (getUsernameDB(candidate)) candidate = `${candidate}_${Math.floor(Math.random() * 10000)}`;

			registerGithubUserDB(candidate, providerId, profile.avatar_url);

			username = candidate;
		}

		const { token, maxAgeSec } = createSessionToken(username, 60);
		const secure = process.env.NODE_ENV === "production";

		reply.header("Set-Cookie", makeSessionCookie(token, { secure, maxAgeSec }));

		if (!FRONTEND_ORIGIN) {
			return reply.code(500).send({ success: false, message: "FRONTEND_ORIGIN not configured" });
		}

		reply.redirect(`${FRONTEND_ORIGIN}/#/menu`);
	});
}

/* export default async function oauthRoutes(fastify: FastifyInstance) {
	// start endpoint that begins the OAuth flow
	fastify.get("/api/auth/github/start", async (_req, reply) => {
		// validate that OAuth variables are set in .env
		if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_REDIRECT_URI) {
			return reply.code(500).send({ success: false, message: "GitHub OAuth not configured in .env" });
		}

		const state = crypto.randomUUID(); // generates a random state value for each login attempt
		setStateCookie(reply, state);

		// build the authorization URL
		const url = new URL("https://github.com/login/oauth/authorize"); // official GitHub OAuth authorization endpoint
		url.searchParams.set("client_id", GITHUB_CLIENT_ID);
		url.searchParams.set("redirect_uri", GITHUB_REDIRECT_URI);
		url.searchParams.set("scope", "read:user user:email"); // access rights of the OAuth request
		url.searchParams.set("state", state);
		reply.redirect(url.toString()); // send a 302 to that URL so the browser is redirected to the GitHub login page
	});

	// callback endpoint that handles the response from the GitHub login page
	fastify.get("/api/auth/github/callback", async (req, reply) => {
		const code = (req.query as any)?.code as string | undefined; // the authorization code that GitHub sends back
		const state = (req.query as any)?.state as string | undefined; // the state value that was set in the start endpoint

		// read the state cookie the browser sent back
		const expected = readCookie(req.headers.cookie, "oauth_state");
		if (!code || !state || !expected || state !== expected) {
			return reply.code(400).send({ success: false, message: "Invalid OAuth state" });
		}

		// send a POST request to the GitHub token endpoint to exchange the authorization code for an access token
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
		// parse the response body as JSON and check if the access token is received
		const tokenBody = (await tokenRes.json()) as { access_token?: string };
		if (!tokenBody.access_token) {
			return reply
				.code(400)
				.send({ success: false, message: "OAuth token exchange failed, because the code was invalid or expired" });
		}

		// fetch the GitHub user profile using the access token
		// - Authorization: Bearer <token> proves who the user is to GitHub
		// - Accept: asks for GitHub's standard JSON format
		// - User-Agent: required header for GitHub API requests
		const profRes = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${tokenBody.access_token}`,
				Accept: "application/vnd.github+json",
				"User-Agent": "ft_transcendence",
			},
		});
		// parse the response and pick id, username and avatar url
		const profile = (await profRes.json()) as {
			id: number;
			login: string;
			avatar_url?: string;
		};
		// store the GitHub numeric id for the db
		const providerId = String(profile.id);

		// check if the user already exists in the db
		const existing = db
			.prepare(`SELECT username FROM users WHERE provider = 'github' AND provider_id = ? LIMIT 1`)
			.get(providerId) as { username: string } | undefined;

		let username: string | undefined;
		if (existing) {
			username = existing.username;
		} else {
			username = undefined;
		}

		// if the user doesn't exist in the db, create a new user
		if (!username) {
			// generate a unique username
			let candidate = profile.login;
			if (getUsernameDB(candidate)) {
				candidate = `${candidate}_${Math.floor(Math.random() * 10000)}`;
			}

			// placeholder password (not used for OAuth accounts, because the password is stored in GitHub)
			const placeholderPassword = crypto.randomBytes(32).toString("hex");

			// insert the new user into the db
			const result = db
				.prepare(
					`
					INSERT INTO users (username, password, provider, provider_id, avatar)
					VALUES (?, ?, 'github', ?, ?)
				`
				)
				.run(candidate, placeholderPassword, providerId, profile.avatar_url || null);
			if (result.changes === 0) return reply.code(400).send({ success: false, message: "Unable to create user" });
			// assign the newly created username
			username = candidate;
		}

		// create a session token and set it as a cookie so the backend knows who the user is without talking to GitHub again
		const { token, maxAgeSec } = createSessionToken(username, 60);
		const secure = process.env.NODE_ENV === "production"; // only set Secure over HTTPS
		reply.header("Set-Cookie", makeSessionCookie(token, { secure, maxAgeSec }));
		if (!FRONTEND_ORIGIN) {
			return reply.code(500).send({ success: false, message: "FRONTEND_ORIGIN not configured" });
		}
		reply.redirect(`${FRONTEND_ORIGIN}/#/menu`);
	});
} */
