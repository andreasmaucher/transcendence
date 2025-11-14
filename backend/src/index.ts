// Main entry point that starts the backend server
import "dotenv/config"; // loads backend/.env at startup
import fastify from "./server.js";
import cors from "@fastify/cors";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
// allows frontend to connect to backend (TODO: pull from env)
console.log("FRONTEND_ORIGIN:", process.env.FRONTEND_ORIGIN);
const ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

// USER_MANAGEMENT
// enable credentials so browsers can send/receive cookies (required for session cookie)
await fastify.register(cors, { origin: ORIGIN, credentials: true });

try {
	// starts the server
	const address = await fastify.listen({ port: PORT, host: HOST });
	// logs the address and origin
	console.log(`[backend] listening on ${address}`);
	console.log(`[backend] allowing CORS from ${ORIGIN}`);
} catch (err) {
	fastify.log.error(err);
	process.exit(1);
}
