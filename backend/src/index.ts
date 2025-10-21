import fastify from "./server.js";
import cors from "@fastify/cors";

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
const ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

await fastify.register(cors, { origin: ORIGIN, credentials: false });

try {
  const address = await fastify.listen({ port: PORT, host: HOST });
  console.log(`[backend] listening on ${address}`);
  console.log(`[backend] allowing CORS from ${ORIGIN}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}