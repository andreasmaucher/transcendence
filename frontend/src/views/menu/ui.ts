import { navigate } from "../../router/router";
import { t } from "../../i18n";
import { initChat } from "../../chat/chatView";
import "./menu.css";
import { applyPageTransition } from "../../utils/transition";

export let disposeChat: (() => void | Promise<void>) | null = null;

export function teardownChat() {
  disposeChat?.();
  disposeChat = null;
}

export async function renderMenu(container: HTMLElement) {
  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "menu-screen";
  container.append(root);



  const title = document.createElement("h1");
  title.textContent = t("menu.title");
  title.className = "menu-title";
  root.append(title);


  const btns = document.createElement("div");
  btns.className = "menu-buttons";
  root.append(btns);

  const localBtn = document.createElement("button");
  localBtn.className = "menu-btn";
  localBtn.textContent = t("menu.localMatch");
  localBtn.onclick = () => navigate("#/game?mode=local");

  const onlineBtn = document.createElement("button");
  onlineBtn.className = "menu-btn";
  onlineBtn.textContent = t("menu.onlineMatch");
  onlineBtn.onclick = () => navigate("#/online");

  const tournamentBtn = document.createElement("button");
  tournamentBtn.className = "menu-btn";
  tournamentBtn.textContent = t("menu.tournaments");
  tournamentBtn.onclick = () => navigate("#/tournament");

  btns.append(localBtn, onlineBtn, tournamentBtn);


  disposeChat = await initChat();
  applyPageTransition(container);
  return () => {
    teardownChat();
  };
}
