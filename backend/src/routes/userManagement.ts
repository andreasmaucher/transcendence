import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getUserByUsernameDB, getUserFriendsDB, isUsernameDB } from "../database/users/getters.js";
import { verifyPassword, hashPassword } from "../user/password.js";
import {
	registerUserDB,
	updateUsernameDB,
	updatePasswordDB,
	updateAvatarDB,
	addFriendDB,
	removeFriendDB,
} from "../database/users/setters.js";
import { clearSessionCookie, createSessionToken, makeSessionCookie } from "../auth/session.js";
import { uploadAvatar } from "../user/cloudinary.js";
import { DEFAULT_AVATAR_URL } from "../config/constants.js";
import { getUserOnline, updateUserOnline } from "../user/online.js";
import { authenticateRequest } from "../auth/verify.js";

export default async function userManagementRoutes(fastify: FastifyInstance) {
	// ROUTES FOR ONE USER ONLY
	// CHECK if username exists (return boolean)
	fastify.get("/api/user/check/:username", async (request: FastifyRequest, reply: FastifyReply) => {
		const { username } = request.params as { username: string };

		const exists = isUsernameDB(username);
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
		if (isUsernameDB(username)) return reply.code(409).send({ success: false, message: "Username already taken" });

		try {
			// Store default avatar if not provided
			let avatarUrl = "";
			if (avatar) avatarUrl = await uploadAvatar(avatar);
			else avatarUrl = DEFAULT_AVATAR_URL;

			// Hash the password and create the user in the database
			const hashedPassword = await hashPassword(password);
			registerUserDB(username, hashedPassword, avatarUrl);

			// Immediately create a session so the user is logged in after registering
			const user = getUserByUsernameDB(username);
			const { token, maxAgeSec } = createSessionToken(username, 60);
			const secure = process.env.NODE_ENV === "production";

			reply.header("Set-Cookie", makeSessionCookie(token, { secure, maxAgeSec }));

			return reply.code(200).send({ success: true, message: "Registration successful" });
		} catch (error: any) {
			console.error("[userRT]", error.message);
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
		const user = getUserByUsernameDB(username);

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
		if (user) user.userWS.close(1000, "User logged out");

		// Expire the cookie immediately
		clearSessionCookie(reply);
		return reply.code(200).send({ success: true });
	});

	// UPDATE user information
	fastify.post("/api/user/update", async (request: FastifyRequest, reply: FastifyReply) => {
		// Check if cookies are valid
		const payload = authenticateRequest(request, reply);
		if (!payload) return reply.code(401).send({ success: false, message: "Unauthorized" });

		// Read posted update data
		const { newUsername, newPassword, newAvatar } = request.body as {
			newUsername?: string;
			newPassword?: string;
			newAvatar?: string;
		};

		const updates = [newUsername, newPassword, newAvatar].filter((v) => v !== undefined);

		if (updates.length !== 1) return reply.code(400).send({ success: false, message: "Too many values to update" });

		if (newUsername) {
			try {
				if (isUsernameDB(newUsername))
					return reply.code(409).send({ success: false, message: "Username already in use" });
				updateUsernameDB(payload.username, newUsername);
				updateUserOnline({
					username: payload.username,
					newUsername: newUsername,
				});
				return reply.code(200).send({ success: true, message: "Username updated successfully" });
			} catch (error: any) {
				console.error("[userRT]", error.message);
				return reply.code(400).send({ success: false, message: "Unable to update username" });
			}
		} else if (newPassword) {
			try {
				const hashedPassword = await hashPassword(newPassword);
				updatePasswordDB(payload.username, hashedPassword);
				return reply.code(200).send({ success: true, message: "Password updated successfully" });
			} catch (error: any) {
				console.error("[userRT]", error.message);
				return reply.code(400).send({ success: false, message: "Unable to update password" });
			}
		} else if (newAvatar) {
			try {
				const avatarUrl = await uploadAvatar(newAvatar);
				updateAvatarDB(payload.username, avatarUrl);
				updateUserOnline({
					username: payload.username,
					newAvatar: newAvatar,
				});
				return reply.code(200).send({ success: true, message: "Avatar updated successfully" });
			} catch (error: any) {
				console.error("[userRT]", error.message);
				return reply.code(400).send({ success: false, message: "Unable to update avatar" });
			}
		} else {
			return reply.code(400).send({ success: false, message: "No valid fields to update" });
		}
	});

	// ADD a friend to the user
	fastify.post("/api/user/add-friend", async (request: FastifyRequest, reply: FastifyReply) => {
		// Check if cookies are valid
		const payload = authenticateRequest(request, reply);
		if (!payload) return reply.code(401).send({ success: false, message: "Unauthorized" });

		// Read posted update data
		const { friend } = request.body as {
			friend: string;
		};

		try {
			addFriendDB(payload.username, friend);
			return reply.code(200).send({ success: true, message: "Friend added successfully" });
		} catch (error: any) {
			console.error("[userRT]", error.message);
			return reply.code(400).send({ success: false, message: "Unable to add friend" });
		}
	});

	// REMOVE a friend from the user
	fastify.post("/api/user/remove-friend", async (request: FastifyRequest, reply: FastifyReply) => {
		// Check if cookies are valid
		const payload = authenticateRequest(request, reply);
		if (!payload) return reply.code(401).send({ success: false, message: "Unauthorized" });

		// Read posted update data
		const { friend } = request.body as {
			friend: string;
		};

		try {
			const friends = getUserFriendsDB(payload.username);
			if (friends.includes(friend)) {
				removeFriendDB(payload.username, friend);
				return reply.code(200).send({ success: true, message: "Friend added successfully" });
			} else reply.code(400).send({ success: false, message: "Friend not present in user friends list" });
		} catch (error: any) {
			console.error("[userRT]", error.message);
			return reply.code(400).send({ success: false, message: "Unable to add friend" });
		}
	});
}
