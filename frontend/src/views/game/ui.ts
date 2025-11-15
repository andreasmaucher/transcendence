import { navigate } from "../../router/router";
import { startGameClient } from "../../game/client";

export function renderGame(container: HTMLElement) {
  container.replaceChildren();

  const title = document.createElement("h1");
  title.textContent = "Game";

  const backBtn = document.createElement("button");
  backBtn.textContent = "Back to Menu";

  const canvas = document.createElement("canvas");
  canvas.id = "gameCanvas";
  canvas.width = 800;
  canvas.height = 600;

  container.append(title, backBtn, canvas);

  // start the game loop + WS connection
  const stopClient = startGameClient(canvas);

  // event handler
  const onBack = () => navigate("#/menu");
  backBtn.addEventListener("click", onBack);

  // return cleanup so router can call it
  return () => {
    backBtn.removeEventListener("click", onBack);
    stopClient();               
  };
}
