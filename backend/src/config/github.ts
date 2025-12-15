//// filepath: /Users/mrizakov/Documents/42/transcendence/backend/src/config/github.ts
import fs from "fs";

function readSecret(path: string): string | undefined {
	try {
		return fs.readFileSync(path, "utf8").trim();
	} catch {
		return undefined;
	}
}

const secretFromFile = readSecret("/run/secrets/github_client_secret");
const clientIdFromFile = readSecret("/run/secrets/github_client_id");

export const GITHUB_CLIENT_ID = clientIdFromFile || "";

export const GITHUB_CLIENT_SECRET = secretFromFile || "";

export const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || "https://localhost:5173/api/auth/github/callback";

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
	throw new Error("Github oauth not configured in .env or Docker secrets");
}
