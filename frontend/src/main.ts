// src/main.ts
import { startRouter, registerRoutes } from "./router/router";
import { setupInputs } from "./game/input";

import { renderMenu } from "./views/menu/ui";
import { renderAuth } from "./views/auth/ui";
import { renderGame } from "./views/game/ui";
import { renderProfile } from "./views/profile/ui";
import { renderTournament } from "./views/tournament/ui";


const app = document.getElementById("app");
if (!app) {
  throw new Error("#app container not found in index.html");
}

setupInputs();

registerRoutes({
  "#/login": renderAuth,
  "#/menu": renderMenu,
  "#/game": renderGame,
  "#/profile": renderProfile,
  "#/tournament": renderTournament,
});

startRouter(app);