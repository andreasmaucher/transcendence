import bcrypt from "bcryptjs";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: number;
  updatedAt: number;
};

export type SessionRecord = {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number; // epoch ms
};

const usersById = new Map<string, UserRecord>();
const usersByEmail = new Map<string, UserRecord>();
const sessionsById = new Map<string, SessionRecord>();

export function generateId(prefix: string = "id"): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`;
}

export async function createUser(
  email: string,
  password: string,
  displayName: string
): Promise<UserRecord> {
  const now = Date.now();
  const id = generateId("usr");
  const passwordHash = await bcrypt.hash(password, 10);
  const user: UserRecord = {
    id,
    email: email.toLowerCase(),
    passwordHash,
    displayName,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  };
  usersById.set(id, user);
  usersByEmail.set(user.email, user);
  return user;
}

export function getUserByEmail(email: string): UserRecord | undefined {
  return usersByEmail.get(email.toLowerCase());
}

export function getUserById(id: string): UserRecord | undefined {
  return usersById.get(id);
}

export function updateUserDisplayName(userId: string, displayName: string): void {
  const user = usersById.get(userId);
  if (!user) return;
  user.displayName = displayName;
  user.updatedAt = Date.now();
}

export function createSession(userId: string, ttlMinutes: number = 60): SessionRecord {
  const id = generateId("sid");
  const now = Date.now();
  const session: SessionRecord = {
    id,
    userId,
    createdAt: now,
    expiresAt: now + ttlMinutes * 60 * 1000,
  };
  sessionsById.set(id, session);
  return session;
}

export function getSession(id: string): SessionRecord | undefined {
  const s = sessionsById.get(id);
  if (!s) return undefined;
  if (Date.now() > s.expiresAt) {
    sessionsById.delete(id);
    return undefined;
  }
  return s;
}

export function deleteSession(id: string): void {
  sessionsById.delete(id);
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  const parts = header.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = decodeURIComponent(part.slice(idx + 1).trim());
    if (k) out[k] = v;
  }
  return out;
}

export function makeSessionCookie(id: string): string {
  const attrs = [
    `sid=${encodeURIComponent(id)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  //if (secure) attrs.push("Secure"); // only for HTTPS in prod, not needed for localhost
  return attrs.join("; ");
}


