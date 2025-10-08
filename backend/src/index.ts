// Loads the Fastify web server library for Node.js
import Fastify from 'fastify';
// Enables CORS so the browser app can call this server
// CORS = Cross-Origin Resource Sharing (fastify tells the browser it's ok for our SPA 5173 to call API 4000)
// without CORS the browser would reject those requests
import cors from '@fastify/cors';

// Creates the server instance
const app = Fastify();
// Port where the server listens
const PORT = Number(4000);
// Website (origin) allowed to call this API (Vite defaults to 5173)
const ORIGIN = 'http://localhost:5173';

// Allows the frontend (at ORIGIN) to make requests to this backend
await app.register(cors, { origin: ORIGIN, credentials: true });

// Minimal health check endpoint (confirms the server is running)
// GET /api/health runs and returns an object. Fastify automatically sends this object as JSON with a 200 OK status.
// this can be checked via: http://localhost:4000/api/health
app.get('/api/health', async () => ({ ok: true, time: new Date().toISOString() }));

// Simple config endpoint to provide game rules from the server
// GET /api/config -> { winningScore: number }
app.get('/api/config', async () => ({ winningScore: Number(process.env.WINNING_SCORE || 11) }));

app.listen({ port: PORT }, (err, address) => {
  if (err) {
    // If the server fails to start, log the error and exit
    app.log.error(err);
    process.exit(1);
  }
  // On success, show the address and which origin is allowed
  console.log(`[backend] listening on ${address}`);
  console.log(`[backend] allowing CORS from ${ORIGIN}`);
});
