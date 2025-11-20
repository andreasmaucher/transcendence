// Enable remote authentication with GitHub

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { createSessionToken, makeSessionCookie } from "../auth/session.js";
import { getGithubUserByProviderIdDB, isUsernameDB } from "../database/users/getters.js";
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
			if (isUsernameDB(candidate)) candidate = `${candidate}_${Math.floor(Math.random() * 10000)}`;

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
