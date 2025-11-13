# Transcendence (42)

**Controls**

-  Left paddle: `W` (up) / `S` (down)
-  Right paddle: `↑` (up) / `↓` (down)

## Run with Docker + Makefile

Prerequisites

-  Docker Desktop (or Docker Engine) with Compose v2 (uses `docker compose`, not `docker-compose`).

Quick start

```bash
# From repo root
make up     # build (if needed) and start backend + frontend in the background
make logs   # follow logs for both services

# Open the app
# Frontend: http://localhost:5173
# Backend:  http://localhost:4000 (health: /api/health)
```

Hot reload

-  Source folders are bind-mounted into containers, so Vite and the Fastify dev server reload on file changes.
-  On macOS, file watching is enabled via `CHOKIDAR_USEPOLLING=1` in Compose.

What each Make target does (under the hood)

-  `make up`
   -  Runs: `docker compose up -d`
   -  Builds images if missing and starts both services detached.
-  `make down`
   -  Runs: `docker compose down`
   -  Stops and removes containers and the default network (keeps volumes).
-  `make stop`
   -  Runs: `docker compose stop`
   -  Gracefully stops containers without removing them.
-  `make build`
   -  Runs: `docker compose build`
   -  Rebuilds images using cache.
-  `make rebuild`
   -  Runs: `docker compose build --no-cache`
   -  Full rebuild without cache (use after changing Dockerfiles or lockfiles).
-  `make restart`
   -  Runs: `docker compose restart`
   -  Restarts running containers.
-  `make logs`
   -  Runs: `docker compose logs -f`
   -  Tails logs for all services.
-  `make ps`
   -  Runs: `docker compose ps`
   -  Shows container status.
-  `make clean`
   -  Runs: `docker compose down -v`
   -  Stops and removes containers, network, and volumes (resets container `node_modules`).
-  `make prune`
   -  Runs: `docker system prune -f`
   -  Removes dangling images/containers/networks (be careful).

Notes from `docker-compose.yaml`

-  Ports
   -  Frontend: `5173:5173` (Vite dev server)
   -  Backend: `4000:4000` (Fastify HTTP/WebSocket)
-  Volumes
   -  `./frontend:/app` and `./backend:/app` for live reload.
   -  `/app/node_modules` as an anonymous volume so container installs don’t pollute the host.
-  Commands
   -  Backend runs `npm run dev` (watch mode).
   -  Frontend runs Vite dev server bound to `0.0.0.0:5173`.
-  If dependencies get out of sync, use `make clean && make up` or `make rebuild`.

## Running the backend and frontend directly (no Docker)

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

## Architecture Overview

-  Fastify drives the authoritative Pong simulation and exposes REST + WebSocket APIs.
-  Vite-powered frontend renders the game canvas and relays paddle inputs to the backend via WebSocket commands.
-  Game state (paddles, ball, score, winner) is streamed from backend → frontend ~60 FPS.

### Backend Endpoints

All backend endpoints return JSON format. All POST request expect the data to be sent in the body.

| Method | Path           | Description                                                  | Returns                    |
| ------ | -------------- | ------------------------------------------------------------ | -------------------------- |
| `GET`  | `/api/health`  | Service heartbeat                                            |                            |
| `GET`  | `/api/config`  | (env override supported)                                     | Returns `{ winningScore }` |
| `POST` | `/api/control` | Optional HTTP paddle control `{ roomId, paddle, direction }` |                            |

## USER

| Method | Path                         | Description                                   | Params                                     | Return                                   |
| ------ | ---------------------------- | --------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| `GET`  | `/api/users/all`             | GET req                                       | None                                       | All users in database                    |
| ------ | ---------------------------- | --------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| `GET`  | `/api/user/:username`        | GET req with username as param                | Username                                   | The user (if it exists)                  |
| `POST` | `/api/user/check`            | POST req, check if username already exists    | Username                                   | True: exists, false: doesn't             |
| `POST` | `/api/user/register`         | POST req, register new user                   | Username, password, avatar?                | Success: true or false                   |
| `POST` | `/api/user/login`            | POST req, check user credentials (login)      | Username, password                         | Success: true or false                   |
| `POST` | `/api/user/logout`           | POST req, log user out                        | Username                                   | Success: true or false                   |
| `POST` | `/api/user/update`           | POST req, update user information, one by one | Username, newUsername?, newPassword?, newAvatar?| Success: true or false              |
| `POST` | `/api/user/add-friend`       | POST req, add other user as friend            | Username, friend                           | Success: true or false                   |
| `POST` | `/api/user/remove-friend`    | POST req, remove other user as friend         | Username, friend                           | Success: true or false                   |
| `GET`  | `/api/user/me`               | GET req                                       | None, but session cookie                   | Current logged-in user                   |

## SINGLE GAME

| Method | Path                     | Description            | Return                                      |
| ------ | ------------------------ | ---------------------- | ------------------------------------------- |
| `WS`   | `/api/single-games/open` | GET req with no params | All open (waiting for players) single games |

## TOURNAMENT

| Method | Path                         | Description                                                     | Return                                        |
| ------ | ---------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| `GET`  | `/api/tournaments/all`       | GET req with no params                                          | All tournaments in database                   |
| `WS`   | `/api/tournaments/open`      | GET req with no params                                          | All open (waiting for players) tournaments    |
| ------ | ---------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| `GET`  | `/api/tournament/:id`        | GET req with tournament id as param                             | The tournament (if it exists)                 |

## MATCH

| Method | Path                        | Description                                                     | Return                                        |
| ------ | --------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| `GET`  | `/api/matches/all`          | GET req with no params                                          | All matches in database                       |
| ------ | --------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| `GET`  | `/api/match/:id`            | GET req with match id as param                                  | The match (if it exists)                      |

## TEST

| Method | Path                          | Description                                   | Return                      |
| ------ | ----------------------------- | --------------------------------------------- | --------------------------- |
| `GET`  | `/api/test/print-users`       | GET req with no params, print in backend logs | All users in database       |
| `GET`  | `/api/test/print-matches`     | GET req with no params, print in backend logs | All matches in database     |
| `GET`  | `/api/test/print-tournaments` | GET req with no params, print in backend logs | All tournaments in database |

WebSocket commands from the frontend:

```json
{ "type": "input", "paddle": "left" | "right", "direction": "up" | "down" | "stop" }
{ "type": "reset" }
```

Server → client messages:

```json
{
	"type": "state",
	"isRunning": true,
	"width": 800,
	"height": 450,
	"tick": 42,
	"paddles": { "left": { "y": 210 }, "right": { "y": 240 } },
	"ball": { "x": 400, "y": 225, "vx": -180, "vy": 90, "r": 8 },
	"score": { "left": 3, "right": 2 },
	"isOver": false,
	"winner": null,
	"winningScore": 11
}
```

### Scripts

```bash
Frontend:
cd frontend && npm ci && npm run dev

Backend:
cd backend && npm ci && npm run dev
```

### Environment Variables

| Variable          | Default                 | Purpose                     |
| ----------------- | ----------------------- | --------------------------- |
| `PORT`            | `4000`                  | Backend HTTP/WebSocket port |
| `HOST`            | `0.0.0.0`               | Backend bind address        |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin         |
| `WINNING_SCORE`   | `11`                    | Target score to win         |

Frontend URL parameters `roomId`, `wsHost`, and `wsPort` let you connect to alternate rooms/hosts without recompiling.
