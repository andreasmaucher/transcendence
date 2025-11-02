import { FastifyInstance } from "fastify";
import { getJsonUserByUsername, getUsername } from "../database/helpers/user_getters.js";
import { verifyPassword, hashPassword } from "../user/password.js";
import { registerUserDB } from "../database/helpers/user_setters.js";
import db from "../database/db_init.js";
import {
  createSessionToken,
  makeSessionCookie,
  parseCookies,
  verifySessionToken,
} from "../auth/session.js";

export default async function userRoutes(fastify: FastifyInstance) {

	// Get user by username
	fastify.get("/api/users/:username", async (request, reply) => {
		const { username } = request.params as { username: string };

		try {
			const user = getJsonUserByUsername(username);
			return reply.code(200).send({ success: true, data: user });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(404).send({ success: false, message: "User not found" });
		}
	});

	// Check if username exists (return boolean)
	fastify.post("/api/users/check", async (request, reply) => {
		const { username } = request.body as { username: string };

		const exists = getUsername(username);
		return reply.code(200).send({ success: true, exists });
	});

	// Check if login credentials are valid
	fastify.post("/api/users/login", async (request, reply) => {
    // Read posted username and password
    const { username, password } = request.body as { username: string; password: string };

    // Check if the password matches the stored hash for this username
    const isValid = await verifyPassword(username, password);
    if (!isValid)
      return reply.code(401).send({ success: false, message: "Invalid credentials" });

    // Look up the full user row to get the numeric id
    const row = getJsonUserByUsername(username);

    // Create a signed session token and attach it as an httpOnly cookie
    const { token, maxAgeSec } = createSessionToken(String(row.id), 60);
    const secure = process.env.NODE_ENV === "production"; // only set Secure over HTTPS
    reply.header("Set-Cookie", makeSessionCookie(token, { secure, maxAgeSec }));

    return reply.code(200).send({ success: true, message: "Login successful" });
	});

  // Register a new user (no avatar URL is collected here)
	fastify.post("/api/users/register", async (request, reply) => {
    // Read posted registration data
    const { username, password } = request.body as { username: string; password: string };

    // Basic validation: required fields
    if (!username || !password)
      return reply.code(400).send({ success: false, message: "Username and password are required" });

    // Duplicate username check (clear message for users)
    if (getUsername(username)) {
      return reply.code(409).send({ success: false, message: "Username already taken" });
    }

    try {
      // Hash the password and create the user in the database
      const hashedPassword = await hashPassword(password);
      // Store empty avatar by default (no avatar URL handled here)
      registerUserDB(username, hashedPassword, "");

      // Immediately create a session so the user is logged in after registering
      const row = getJsonUserByUsername(username);
      const { token, maxAgeSec } = createSessionToken(String(row.id), 60);
      const secure = process.env.NODE_ENV === "production";
      reply.header("Set-Cookie", makeSessionCookie(token, { secure, maxAgeSec }));

      return reply.code(200).send({ success: true, message: "Registration successful" });
    } catch (error: any) {
      console.log(error.message);
      // If a race condition triggered a DB unique constraint, reply with 409
      return reply.code(409).send({ success: false, message: "Username already taken" });
      
    }
	});

  // Return the current logged-in user, based on the session cookie
  fastify.get("/api/users/me", async (request, reply) => {
    // Extract cookies from the request header
    const cookies = parseCookies(request.headers.cookie);
    const sid = cookies["sid"];
    if (!sid) return reply.code(401).send({ success: false, message: "Unauthorized" });

    // Verify the session token and get the user id
    const payload = verifySessionToken(sid);
    if (!payload) return reply.code(401).send({ success: false, message: "Unauthorized" });

    // Look up the user by id in the database
    try {
      const stmt = db.prepare(`SELECT id, username, avatar, created_at FROM users WHERE id = ?`);
      const user = stmt.get(Number(payload.userId));
      if (!user) return reply.code(401).send({ success: false, message: "Unauthorized" });
      return reply.code(200).send({ success: true, data: user });
    } catch (err: any) {
      console.log(err?.message || err);
      return reply.code(500).send({ success: false, message: "Failed to load user" });
    }
  });

  // Logout: clears the session cookie on the client
  fastify.post("/api/users/logout", async (_request, reply) => {
    // Expire the cookie immediately
    reply.header(
      "Set-Cookie",
      "sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    );
    return reply.code(200).send({ success: true });
  });
}