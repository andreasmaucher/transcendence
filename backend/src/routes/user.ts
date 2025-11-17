import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getAllUsersDB, getJsonUserByUsernameDB, getUserFriendsDB, getUsernameDB } from "../database/users/getters.js";
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
import { getUserOnline, updateUserOnline } from "../user/online.js";

export default async function userRoutes(fastify: FastifyInstance) {
	// ROUTES FOR MULTIPLE USERS
	// GET all users in the database
	fastify.get("/api/users/all", async (_request, reply) => {
		try {
			const users = getAllUsersDB();
			return reply.code(200).send({ success: true, data: users });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(500).send({ success: false, message: "Unable to retrieve users" });
		}
	});

	// ROUTES FOR ONE USER ONLY
	// GET user by username
	fastify.get("/api/user/:username", async (request: FastifyRequest, reply: FastifyReply) => {
		const { username } = request.params as { username: string };

		try {
			const user = getJsonUserByUsernameDB(username);
			return reply.code(200).send({ success: true, data: user });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(404).send({ success: false, message: "User not found" });
		}
	});

	// CHECK if username exists (return boolean)
	fastify.post("/api/user/check", async (request: FastifyRequest, reply: FastifyReply) => {
		const { username } = request.body as { username: string };

		const exists = getUsernameDB(username);
		return reply.code(200).send({ success: true, exists });
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
		if (getUsernameDB(username)) return reply.code(409).send({ success: false, message: "Username already taken" });

		try {
			// Store default avatar if not provided
			let avatarUrl = "";
			if (avatar) avatarUrl = await uploadAvatar(avatar);
			else avatarUrl = DEFAULT_AVATAR_URL;

			// Hash the password and create the user in the database
			const hashedPassword = await hashPassword(password);
			registerUserDB(username, hashedPassword, avatarUrl);

			// Immediately create a session so the user is logged in after registering
			const user = getJsonUserByUsernameDB(username);
			const { token, maxAgeSec } = createSessionToken(username, 60);
			const secure = process.env.NODE_ENV === "production";

			reply.header("Set-Cookie", makeSessionCookie(token, { secure, maxAgeSec }));

			return reply.code(200).send({ success: true, message: "Registration successful" });
		} catch (error: any) {
			console.log(error.message);
			return reply.code(400).send({ success: false, message: "Unable to register user" });
		}
	});

	// LOGIN existing user
	fastify.post("/api/user/login", async (request: FastifyRequest, reply: FastifyReply) => {
		// Read posted username and password
		const { username, password } = request.body as { username: string; password: string };

		// Check if the password matches the stored hash for this username
		const isValid = await verifyPassword(username, password);
		if (!isValid) return reply.code(401).send({ success: false, message: "Invalid credentials" });

		// Look up the full user row to get the numeric id
		const user = getJsonUserByUsernameDB(username);

		// Create a signed session token and attach it as an httpOnly cookie
		const { token, maxAgeSec } = createSessionToken(username, 60);
		const secure = process.env.NODE_ENV === "production"; // only set Secure over HTTPS

		reply.header("Set-Cookie", makeSessionCookie(token, { secure, maxAgeSec }));

		return reply.code(200).send({ success: true, message: "Login successful" });
	});

	// LOGOUT user: clears the session cookie on the client
	fastify.post("/api/user/logout", async (request: FastifyRequest, reply: FastifyReply) => {
		const { username } = request.body as {
			username: string;
		};
		const user = getUserOnline(username);
		// Close user websocket connection
		if (user) user.socket.close(1000, "User logged out");

		// Expire the cookie immediately
		reply.header("Set-Cookie", "sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
		return reply.code(200).send({ success: true });
	});

	// UPDATE user information
	fastify.post("/api/user/update", async (request: FastifyRequest, reply: FastifyReply) => {
		// Read posted update data
		const { username, newUsername, newPassword, newAvatar } = request.body as {
			username: string;
			newUsername?: string;
			newPassword?: string;
			newAvatar?: string;
		};

		// Basic validation: required fields
		if (!username) return reply.code(400).send({ success: false, message: "Username is required" });

		const updates = [newUsername, newPassword, newAvatar].filter((v) => v !== undefined);

		if (updates.length !== 1) return reply.code(400).send({ success: false, message: "Too many values to update" });

		if (newUsername) {
			try {
				if (getUsernameDB(newUsername))
					return reply.code(409).send({ success: false, message: "Username already in use" });
				updateUsernameDB(username, newUsername);
				updateUserOnline({
					username: username,
					newUsername: newUsername,
				});
				return reply.code(200).send({ success: true, message: "Username updated successfully" });
			} catch (error: any) {
				console.log(error.message);
				return reply.code(400).send({ success: false, message: "Unable to update username" });
			}
		} else if (newPassword) {
			try {
				const hashedPassword = await hashPassword(newPassword);
				updatePasswordDB(username, hashedPassword);
				return reply.code(200).send({ success: true, message: "Password updated successfully" });
			} catch (error: any) {
				console.log(error.message);
				return reply.code(400).send({ success: false, message: "Unable to update password" });
			}
		} else if (newAvatar) {
			try {
				const avatarUrl = await uploadAvatar(newAvatar);
				updateAvatarDB(username, avatarUrl);
				updateUserOnline({
					username: username,
					newAvatar: newAvatar,
				});
				return reply.code(200).send({ success: true, message: "Avatar updated successfully" });
			} catch (error: any) {
				console.log(error.message);
				return reply.code(400).send({ success: false, message: "Unable to update avatar" });
			}
		} else {
			return reply.code(400).send({ success: false, message: "No valid fields to update" });
		}
	});

	// ADD a friend to the user
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

	// REMOVE a friend from the user
	fastify.post("/api/user/remove-friend", async (request: FastifyRequest, reply: FastifyReply) => {
		// Read posted update data
		const { username, friend } = request.body as {
			username: string;
			friend: string;
		};

		// Basic validation: required fields
		if (!username) return reply.code(400).send({ success: false, message: "Username is required" });

		try {
			const friends = getUserFriendsDB(username);
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
			const user = getJsonUserByUsernameDB(payload.username);
			// Return only safe fields to the frontend (omit password, provider secrets, etc.)
			const safeUser = {
				id: user.internal_id,
				username: user.username,
				avatar: user.avatar ?? null,
				created_at: user.created_at,
			};
			return reply.code(200).send({ success: true, data: safeUser });
		} catch (error: any) {
			console.log(error.message);
			clearSessionCookie(reply);
			return reply.code(404).send({ success: false, message: "User not found" });
		}
	});
}
