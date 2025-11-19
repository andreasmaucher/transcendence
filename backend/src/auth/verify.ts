import { FastifyReply, FastifyRequest } from "fastify";
import { clearSessionCookie, parseCookies, verifySessionToken } from "./session.js";

export function authenticateWebSocket(request: any, socket: any) {
	// Extract cookies from the request header
	const cookies = parseCookies(request.headers.cookie);
	const sid = cookies["sid"];
	if (!sid) {
		console.log("[WS] Unauthorized user");
		return null;
	}

	// Verify the session token and get the user id
	const payload = verifySessionToken(sid);
	if (!payload) {
		console.log("[WS] Unauthorized user");
		try {
			socket.close(4401, "Unauthorized");
		} catch {}
		return null;
	}
	return payload;
}

export function authenticateRequest(request: FastifyRequest, reply: FastifyReply) {
	// Extract cookies from the request header
	const cookies = parseCookies(request.headers.cookie);
	const sid = cookies["sid"];
	if (!sid) {
		clearSessionCookie(reply);
		console.log("[ROUTES] Unauthorized user");
		return null;
	}

	// Verify the session token and get the user id
	const payload = verifySessionToken(sid);
	if (!payload) {
		clearSessionCookie(reply);
		console.log("[ROUTES] Unauthorized user");
		return null;
	}
	return payload;
}
