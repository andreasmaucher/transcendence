import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import {
  createUser,
  getUserByEmail,
  getUserById,
  createSession,
  deleteSession,
  getSession,
  makeSessionCookie,
  parseCookies,
} from "./store.js";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function registerUserAuthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/api/auth/register", async (request, reply) => {
    const body = request.body as Partial<{ email: string; password: string; displayName: string }>;
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");
    const displayName = String(body?.displayName ?? "").trim();
    if (!validateEmail(email) || password.length < 6 || displayName.length < 3) {
      reply.code(400);
      return { error: "invalid input" };
    }
    if (getUserByEmail(email)) {
      reply.code(409);
      return { error: "email already registered" };
    }
    const user = await createUser(email, password, displayName);
    const session = createSession(user.id, 60);
    reply.header("Set-Cookie", makeSessionCookie(session.id));
    return { ok: true };
  });

  fastify.post("/api/auth/login", async (request, reply) => {
    const body = request.body as Partial<{ email: string; password: string }>;
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");
    const user = getUserByEmail(email);
    if (!user) {
      reply.code(401);
      return { error: "invalid credentials" };
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      reply.code(401);
      return { error: "invalid credentials" };
    }
    const session = createSession(user.id, 60);
    reply.header("Set-Cookie", makeSessionCookie(session.id));
    return { ok: true };
  });

  fastify.post("/api/auth/logout", async (request, reply) => {
    const cookies = parseCookies(request.headers.cookie);
    const sid = cookies["sid"];
    if (sid) deleteSession(sid);
    reply.header("Set-Cookie", "sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    return { ok: true };
  });

  fastify.get("/api/users/me", async (request, reply) => {
    const cookies = parseCookies(request.headers.cookie);
    const sid = cookies["sid"];
    if (!sid) {
      reply.code(401);
      return { error: "unauthorized" };
    }
    const session = getSession(sid);
    if (!session) {
      reply.code(401);
      return { error: "unauthorized" };
    }
    const user = getUserById(session.userId);
    if (!user) {
      reply.code(401);
      return { error: "unauthorized" };
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  });
}


