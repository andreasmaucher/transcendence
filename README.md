# Transcendence (42)

## Quick Start

```bash
# Frontend (Vite)
npm install
npm run dev

# Backend (Fastify + websockets)
cd backend
npm install
npm run dev
```

Open `http://localhost:5173` in the browser once both servers are running. The frontend connects to the backend WebSocket at `ws://localhost:4000/api/rooms/default/ws` by default.

**Controls**
- Left paddle: `W` (up) / `S` (down)
- Right paddle: `↑` (up) / `↓` (down)

## Architecture Overview

- Fastify drives the authoritative Pong simulation and exposes REST + WebSocket APIs.
- Vite-powered frontend renders the game canvas and relays paddle inputs to the backend via WebSocket commands.
- Game state (paddles, ball, score, winner) is streamed from backend → frontend ~60 FPS.

### Backend Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Service heartbeat |
| `GET` | `/api/config` | Returns `{ winningScore }` (env override supported) |
| `POST` | `/api/control` | Optional HTTP paddle control `{ roomId, paddle, direction }` |
| `GET` | `/api/rooms/:id/state` | One-off JSON snapshot of a room |
| `WS` | `/api/rooms/:id/ws` | Live state stream + paddle/input channel |

WebSocket commands from the frontend:

```json
{ "type": "input", "paddle": "left" | "right", "direction": "up" | "down" | "stop" }
{ "type": "reset" }
```

Server → client messages:

```json
{
  "type": "state",
  "tick": 42,
  "paddles": { "left": { "y": 210 }, "right": { "y": 240 } },
  "ball": { "x": 400, "y": 225, "r": 8 },
  "score": { "left": 3, "right": 2 },
  "gameOver": false,
  "winner": null,
  "winningScore": 11
}
```

### Scripts

```bash
# Frontend production build
npm run build

# Backend build + tests
cd backend
npm run build
npm run test
```

### Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | Backend HTTP/WebSocket port |
| `HOST` | `0.0.0.0` | Backend bind address |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `WINNING_SCORE` | `11` | Target score to win |

Frontend URL parameters `roomId`, `wsHost`, and `wsPort` let you connect to alternate rooms/hosts without recompiling.