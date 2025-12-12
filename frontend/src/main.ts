import { startRouter, registerRoutes } from "./router/router";
import { setupInputs } from "./game/input";

import { renderMenu } from "./views/menu/ui";
import { renderAuth } from "./views/auth/ui";
import { renderGame } from "./views/game/ui";
import { renderProfile } from "./views/profile/ui";
import { renderTournament } from "./views/tournament/ui";
import { initTopBar } from "./views/topbar/ui";
import { renderOnlineLobby } from "./views/online/ui";
import { renderUserProfile } from "./views/userProfile/ui";

import "./global.css";

import { initStarfield } from "./rendering/starfield";


const app = document.getElementById("app");
if (!app) {
  throw new Error("#app container not found in index.html");
}

initStarfield();    

setupInputs();
initTopBar();

registerRoutes({
  "#/login": renderAuth,
  "#/menu": renderMenu,
  "#/game": renderGame,
  "#/profile": renderProfile,
  "#/tournament": renderTournament,
  "#/online": renderOnlineLobby,
  "#/user": renderUserProfile,
});

startRouter(app);
