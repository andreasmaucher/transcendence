// main entry point that starts the backend server

import fastify from "./server.js";
import cors from "@fastify/cors";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
// allows frontend to connect to backend (TODO: pull from env)
const ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5174";

await fastify.register(cors, { origin: ORIGIN, credentials: false });

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