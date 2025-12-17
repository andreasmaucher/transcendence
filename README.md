# Transcendence (42)

A full-stack multiplayer Pong web application built as part of the 42 curriculum. Players can compete in real-time matches or tournaments, chat with other users, and have their tournament results permanently recorded on the Ethereum blockchain. The app supports GitHub OAuth authentication, user profiles with friends/blocked lists, and is available in three languages.

---

## Technologies

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Backend** | Fastify + TypeScript | Lightweight, high-performance Node.js framework with first-class WebSocket support for real-time game state streaming |
| **Frontend** | Vite + TypeScript | Fast HMR development, native ES modules, and minimal config for single-page application |
| **Database** | SQLite (better-sqlite3) | Embedded database with zero setup, perfect for single-server deployment; synchronous API simplifies game state management |
| **Authentication** | bcryptjs + GitHub OAuth | Secure password hashing with industry-standard algorithm; OAuth provides passwordless login option |
| **Blockchain** | Hardhat + Solidity (Sepolia) | Smart contract stores immutable tournament match results; ethers.js for frontend/backend chain interaction |
| **Infrastructure** | Docker Compose | Reproducible containerized deployment with a single command |

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────┐
│                              users                                  │
├─────────────────────────────────────────────────────────────────────┤
│ internal_id │ username │ password │ provider │ provider_id │ avatar │
│ friends     │ blocked  │ stats    │ created_at                      │
└─────────────────────────────────────────────────────────────────────┘
        │                          │
        │                          ▼
        │            ┌─────────────────────────────────────┐
        │            │        tournament_players           │
        │            ├─────────────────────────────────────┤
        │            │tournament_id│username│ display_name │
        │            └─────────────────────────────────────┘
        │                          │
        ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           tournaments                               │
├─────────────────────────────────────────────────────────────────────┤
│ internal_id │ id │ name │ size │ winner │ creator                   │
│ created_at  │ started_at │ ended_at │ notes                         │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                             matches                                 │
├─────────────────────────────────────────────────────────────────────┤
│ internal_id │ id │ mode │ player_left │ player_right │ tournament_id│
│ round │ in_tournament_type │ in_tournament_placement_range          │
│ score_left │ score_right │ winner │ started_at │ ended_at │ tx_hash │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                            messages                                 │
├─────────────────────────────────────────────────────────────────────┤
│ internal_id │ id │ sender │ receiver │ type │ content │ game_id     │
│ sent_at                                                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

- **Real-time Pong gameplay** with server-authoritative physics (~60 FPS state updates)
- **Local multiplayer** (two players on same keyboard)
- **Remote multiplayer** over WebSocket
- **Tournament system** with bracket matchmaking
- **Blockchain integration** — tournament match results saved to Ethereum (Sepolia testnet)
- **User accounts** with registration, login, avatars, friends, and block lists
- **GitHub OAuth** for passwordless authentication
- **Live chat** with direct messages and game invites
- **Internationalization** (English, German, French)
- **Responsive SPA** with browser history navigation

---

## Chosen Modules & Points

| Module | Type | Points | Description |
|--------|------|--------|-------------|
| **Backend Framework** | Major | 2 | Fastify with TypeScript for REST API and WebSocket game server |
| **Tournament on Blockchain** | Major | 2 | Solidity smart contract (`TournamentMatches.sol`) stores match results immutably on Sepolia |
| **User Management** | Major | 2 | Registration, login, profiles, avatars, friends/blocked lists, password hashing |
| **Remote Authentication** | Major | 2 | GitHub OAuth integration with CSRF protection |
| **Remote Players** | Major | 2 | Real-time multiplayer over WebSocket with server-authoritative game state |
| **Live Chat** | Major | 2 | Direct messaging, game invites, online status |
| **Database** | Minor | 1 | SQLite with better-sqlite3 for persistent storage |
| **Browser Compatibility** | Minor | 1 | Tested and compatible with latest Firefox and Chrome |
| **Multiple Languages** | Minor | 1 | i18n support for English, German, and French |
| **User and Game Stats Dashboards** | Minor | 1 | Detailed dashboard for user statistics and match history |

### Points Summary

| Category | Points |
|----------|--------|
| Major Modules (6 × 2) | 12 |
| Minor Modules (4 × 1) | 4 |
| **Total** | **16** |
| Requirement | 14 |
| **Bonus** | **+2** |

---

## Controls

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

## WEBSOCKETS

| Method | Path                             | Description                            | Params                      | Return                        |
|--------|----------------------------------|----------------------------------------|-----------------------------|-------------------------------|
| `WS`   | `/api/user/ws`                   | WS req, registers web socket           | None                        | User socket                   |
|--------|----------------------------------|----------------------------------------|-----------------------------|-------------------------------|
| `WS`   | `/api/local-single-game/:id/ws`  | WS req, registers web socket           | Id (local single game id)   | Local single game socket      |
| `WS`   | `/api/single-game/:id/ws`        | WS req, registers web socket           | Id (remote single game id)  | Remote single game socket     |
|--------|----------------------------------|----------------------------------------|-----------------------------|-------------------------------|
| `WS`   | `/api/tournament/:id/ws`         | WS req, registers web socket           | Id (tournament)             | Tournament socket             |

## USER

| Method | Path                             | Description                            | Params                      | Return                        |
|--------|----------------------------------|----------------------------------------|-----------------------------|-------------------------------|
| `GET`  | `/api/users/all`                 | GET req                                | None                        | All users in database         |
| `GET`  | `/api/users/online`              | GET req                                | None                        | All online users              |
|--------|----------------------------------|----------------------------------------|-----------------------------|-------------------------------|
| `GET`  | `/api/user/:username`            | GET req with username as param         | Username                    | The user (if it exists)       |
| `GET`  | `/api/user/online/:username`     | Checks if username is online           | Username                    | True or false                 |
| `GET`  | `/api/user/data`                 | GET req                                | None (session cookie)       | userData                      |
| `GET`  | `/api/user/me`                   | Returns logged-in user                 | None (session cookie)       | Current logged-in user        |


## USER MANAGEMENT

| Method | Path                             | Description                            | Params                      | Return                        |
|--------|----------------------------------|----------------------------------------|-----------------------------|-------------------------------|
| `GET`  | `/api/user/check/:username`      | Checks if username already exists      | Username                    | True or false                 |
| `POST` | `/api/user/register`             | Registers new user                     | Username, password, avatar? | True or false                 |
| `POST` | `/api/user/login`                | Checks user credentials                | Username, password          | True or false                 |
| `POST` | `/api/user/logout`               | Logs user out                          | Username                    | True or false                 |
| `POST` | `/api/user/update`               | Updates user information               | Username, newUsername?, newP | True or false                |
| `POST` | `/api/user/add-friend`           | Adds other user as friend              | Username, friend            | True or false                 |
| `POST` | `/api/user/remove-friend`        | Removes other user as friend           | Username, friend            | True or false                 |

## GAMES (BOTH SINGLE AND TOURNAMENTS)

| Method | Path                             | Description                            | Params                      | Return                        |
|--------|----------------------------------|----------------------------------------|-----------------------------|-------------------------------|
| `GET`  | `/api/games/open`                | GET req                                | None                        | All open games                |

## SINGLE GAME

| Method | Path                             | Description                            | Params                      | Return                        |
|--------|----------------------------------|----------------------------------------|-----------------------------|-------------------------------|
| `GET`  | `/api/single-games/open`         | GET req                                | None                        | All open single games         |
| `GET`  | `/api/single-games/is-open/:id`  | Check if single game is open           | Id (single game)            | True or false                 |

## TOURNAMENT

| Method | Path                             | Description                            | Params                      | Return                        |
|--------|----------------------------------|----------------------------------------|-----------------------------|-------------------------------|
| `GET`  | `/api/tournaments/all`           | GET req                                | None                        | All tournaments in database   |
| `GET`  | `/api/tournaments/open`          | GET req                                | None                        | All open tournaments          |
|--------|----------------------------------|----------------------------------------|-----------------------------|-------------------------------|
| `GET`  | `/api/tournament/:id`            | GET req                                | Id (tournament)             | The tournament (if exists)    |
| `GET`  | `/api/tournament/is-open/:id`    | Check if tournament is open            | Id (tournament)             | True or false                 |

## MATCH

| Method | Path                             | Description                            | Params                      | Return                        |
|--------|----------------------------------|----------------------------------------|-----------------------------|-------------------------------|
| `GET`  | `/api/matches/all`               | GET req                                | None                        | All matches in database       |
|--------|----------------------------------|----------------------------------------|-----------------------------|-------------------------------|
| `GET`  | `/api/match/:id`                 | GET req                                | Id (match)                  | The match (if exists)         |

## TEST

| Method | Path                             | Description                            | Params                      | Return                        |
|--------|----------------------------------|----------------------------------------|-----------------------------|-------------------------------|
| `GET`  | `/api/test/print-users`          | Prints data in backend logs            | None                        | All users in database         |
| `GET`  | `/api/test/print-matches`        | Prints data in backend logs            | None                        | All matches in database       |
| `GET`  | `/api/test/print-tournaments`    | Prints data in backend logs            | None                        | All tournaments in database   |
| `GET`  | `/api/test/print-tournaments2`   | With tournament player struct          | None                        | All tournaments in database   |
| `GET`  | `/api/test/create-tournaments`   | Creates 5 test tournaments             | None                        | True or false                 |
| `GET`  | `/api/test/create-single-games`  | Creates 5 test single games            | None                        | True or false                 |

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

#### Acronyms (in error messages)

MM = MatchManager
SGM = SingleGameManager
TM = TournamentManager
RT = Routes
BE = Backend
FE = Frontend
