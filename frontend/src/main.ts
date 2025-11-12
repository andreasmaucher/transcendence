// src/main.ts
import { startRouter, registerRoutes } from "./router/router";
import { renderAuth } from "./views/auth/ui";
import { renderMenu } from "./views/menu/ui";
import { renderGame } from "./views/game/ui";
import { renderProfile } from "./views/profile/ui";

const app = document.getElementById("app");
if (!app) {
  throw new Error("#app container not found in index.html");
}

registerRoutes({
  "#/login": renderAuth,
  "#/menu": renderMenu,
  "#/game": renderGame,
  "#/profile": renderProfile,
});

startRouter(app);
