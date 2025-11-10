import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getJsonUserByUsername, getUserFriends, getUsername } from "../database/users/getters.js";
import { verifyPassword, hashPassword } from "../user/password.js";
import {
	registerUserDB,
	updateUsernameDB,
	updatePasswordDB,
	updateAvatarDB,
	addFriendDB,
	removeFriendDB,
} from "../database/users/setters.js";
import {
	createSessionToken,
	makeSessionCookie,
	parseCookies,
	verifySessionToken,
	clearSessionCookie,
} from "../auth/session.js";
import { uploadAvatar } from "../user/cloudinary.js";
import { DEFAULT_AVATAR_URL } from "../config/constants.js";

export default async function userRoutes(fastify: FastifyInstance) {
	// GET user by username
	fastify.get("/api/user/:username", async (request: FastifyRequest, reply: FastifyReply) => {
		const { username } = request.params as { username: string };

		try {
			const user = getJsonUserByUsername(username);
			return reply.code(200).send({ success: true, data: user });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(404).send({ success: false, message: "User not found" });
		}
	});

	// CHECK if username exists (return boolean)
	fastify.post("/api/user/check", async (request: FastifyRequest, reply: FastifyReply) => {
		const { username } = request.body as { username: string };

		const exists = getUsername(username);
		return reply.code(200).send({ success: true, exists });
	});

	// LOGIN existing user
	fastify.post("/api/user/login", async (request: FastifyRequest, reply: FastifyReply) => {
		// Read posted username and password
		const { username, password } = request.body as { username: string; password: string };

		// Check if the password matches the stored hash for this username
		const isValid = await verifyPassword(username, password);
		if (!isValid) return reply.code(401).send({ success: false, message: "Invalid credentials" });

		// Look up the full user row to get the numeric id
		const row = getJsonUserByUsername(username);

		// Create a signed session token and attach it as an httpOnly cookie
		//const { token, maxAgeSec } = createSessionToken(String(row.id), 60);
		const { token, maxAgeSec } = createSessionToken(username, 60);
		const secure = process.env.NODE_ENV === "production"; // only set Secure over HTTPS
		reply.header("Set-Cookie", makeSessionCookie(token, { secure, maxAgeSec }));

		return reply.code(200).send({ success: true, message: "Login successful" });
	});

	// REGISTER a new user
	fastify.post("/api/user/register", async (request: FastifyRequest, reply: FastifyReply) => {
		// Read posted registration data
		const { username, password, avatar } = request.body as {
			username: string;
			password: string;
			avatar?: string;
		};

		// Basic validation: required fields
		if (!username || !password)
			return reply.code(400).send({ success: false, message: "Username and password are required" });

		// Duplicate username check (clear message for users)
		if (getUsername(username)) return reply.code(409).send({ success: false, message: "Username already taken" });

		try {
			// Store default avatar if not provided
			let avatarUrl = "";
			if (avatar) avatarUrl = await uploadAvatar(avatar);
			else avatarUrl = DEFAULT_AVATAR_URL;

			// Hash the password and create the user in the database
			const hashedPassword = await hashPassword(password);
			registerUserDB(username, hashedPassword, avatarUrl);

			// Immediately create a session so the user is logged in after registering
			const row = getJsonUserByUsername(username);
			const { token, maxAgeSec } = createSessionToken(username, 60);
			const secure = process.env.NODE_ENV === "production";
			reply.header("Set-Cookie", makeSessionCookie(token, { secure, maxAgeSec }));

			return reply.code(200).send({ success: true, message: "Registration successful" });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(400).send({ success: false, message: "Unable to register user" });
		}
	});

	// UPDATE user information
	fastify.post("/api/user/update", async (request: FastifyRequest, reply: FastifyReply) => {
		// Read posted update data
		const { username, newUsername, password, avatar } = request.body as {
			username: string;
			newUsername?: string;
			password?: string;
			avatar?: string;
		};

		// Basic validation: required fields
		if (!username) return reply.code(400).send({ success: false, message: "Username is required" });

		const updates = [newUsername, password, avatar].filter((v) => v !== undefined);

		if (updates.length !== 1) return reply.code(400).send({ success: false, message: "Too many values to update" });

		if (newUsername) {
			try {
				if (getUsername(newUsername))
					return reply.code(409).send({ success: false, message: "Username already in use" });
				updateUsernameDB(username, newUsername);
				return reply.code(200).send({ success: true, message: "Username updated successfully" });
			} catch (error: any) {
				console.log(error.message);
				return reply.code(400).send({ success: false, message: "Unable to update username" });
			}
		} else if (password) {
			try {
				const hashedPassword = await hashPassword(password);
				updatePasswordDB(username, hashedPassword);
				return reply.code(200).send({ success: true, message: "Password updated successfully" });
			} catch (error: any) {
				console.log(error.message);
				return reply.code(400).send({ success: false, message: "Unable to update password" });
			}
		} else if (avatar) {
			try {
				const avatarUrl = await uploadAvatar(avatar);
				updateAvatarDB(username, avatarUrl);
				return reply.code(200).send({ success: true, message: "Avatar updated successfully" });
			} catch (error: any) {
				console.log(error.message);
				return reply.code(400).send({ success: false, message: "Unable to update avatar" });
			}
		} else {
			return reply.code(400).send({ success: false, message: "No valid fields to update" });
		}
	});

	// Add a FRIEND to the user
	fastify.post("/api/user/add-friend", async (request: FastifyRequest, reply: FastifyReply) => {
		// Read posted update data
		const { username, friend } = request.body as {
			username: string;
			friend: string;
		};

		// Basic validation: required fields
		if (!username) return reply.code(400).send({ success: false, message: "Username is required" });

		try {
			addFriendDB(username, friend);
			return reply.code(200).send({ success: true, message: "Friend added successfully" });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(400).send({ success: false, message: "Unable to add friend" });
		}
	});

	// Remove a FRIEND from the user
	fastify.post("/api/user/remove-friend", async (request: FastifyRequest, reply: FastifyReply) => {
		// Read posted update data
		const { username, friend } = request.body as {
			username: string;
			friend: string;
		};

		// Basic validation: required fields
		if (!username) return reply.code(400).send({ success: false, message: "Username is required" });

		try {
			const friends = getUserFriends(username);
			if (friends.includes(friend)) {
				removeFriendDB(username, friend);
				return reply.code(200).send({ success: true, message: "Friend added successfully" });
			} else reply.code(400).send({ success: false, message: "Friend not present in user friends list" });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(400).send({ success: false, message: "Unable to add friend" });
		}
	});

	// RETURN the current logged-in user, based on the session cookie
	fastify.get("/api/user/me", async (request: FastifyRequest, reply: FastifyReply) => {
		// Extract cookies from the request header
		const cookies = parseCookies(request.headers.cookie);
		const sid = cookies["sid"];
		if (!sid) {
			clearSessionCookie(reply);
			return reply.code(401).send({ success: false, message: "Unauthorized" });
		}

		// Verify the session token and get the user id
		const payload = verifySessionToken(sid);
		if (!payload) {
			clearSessionCookie(reply);
			return reply.code(401).send({ success: false, message: "Unauthorized" });
		}

		// Look up the user by username in the database
		try {
			const user = getJsonUserByUsername(payload.username);
			return reply.code(200).send({ success: true, data: user });
		} catch (error: any) {
			console.log(error.message);
			clearSessionCookie(reply);
			return reply.code(404).send({ success: false, message: "User not found" });
		}
	});

	// LOGOUT user: clears the session cookie on the client
	fastify.post("/api/user/logout", async (_request: FastifyRequest, reply: FastifyReply) => {
		// Expire the cookie immediately
		reply.header("Set-Cookie", "sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
		return reply.code(200).send({ success: true });
	});
}
