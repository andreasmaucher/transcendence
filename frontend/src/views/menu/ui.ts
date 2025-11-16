// src/views/menu/ui.ts
import { navigate } from "../../router/router";

export function renderMenu(container: HTMLElement) {
  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "menu-screen";
  container.append(root);

  // Title
  const title = document.createElement("h1");
  title.textContent = "PONG";
  title.style.textAlign = "center";
  title.style.width = "100%";
  root.append(title);

  // Buttons
  const btns = document.createElement("div");
  btns.className = "menu-buttons";
  btns.style.justifyContent = "center";
  root.append(btns);

  const playBtn = document.createElement("button");
  playBtn.textContent = "Play Game";

  const tournamentBtn = document.createElement("button");
  tournamentBtn.textContent = "Tournaments";

  btns.append(playBtn, tournamentBtn);

  // Shared floating submenu 
  const submenu = document.createElement("div");
  submenu.className = "submenu";
  submenu.style.position = "absolute";
  submenu.style.display = "none";
  submenu.style.flexDirection = "column";
  submenu.style.gap = "8px";
  submenu.style.padding = "10px";
  submenu.style.background = "rgba(0,0,0,0.7)";
  submenu.style.border = "1px solid #777";
  submenu.style.borderRadius = "6px";
  submenu.style.zIndex = "9999";
  root.append(submenu);

  function showSubmenu(content: HTMLElement, anchor: HTMLElement) {
    submenu.innerHTML = "";
    submenu.append(content);

    const rect = anchor.getBoundingClientRect();
    submenu.style.left = rect.left + "px";
    submenu.style.top = rect.bottom + "px";
    submenu.style.display = "flex";
  }

  function hideSubmenu() {
    submenu.style.display = "none";
  }

  // PLAY GAME Hover submenu (Local / Online)
  playBtn.onmouseenter = () => {
    const box = document.createElement("div");
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.gap = "6px";

    const localBtn = document.createElement("button");
    localBtn.textContent = "Local Match";
    localBtn.onclick = () => navigate("#/game?mode=local");

    const onlineBtn = document.createElement("button");
    onlineBtn.textContent = "Online Match";
    onlineBtn.onclick = () => navigate("#/game?mode=online");

    box.append(localBtn, onlineBtn);
    showSubmenu(box, playBtn);
  };

  // TOURNAMENT: direct navigation, no submenu
  tournamentBtn.onclick = () => navigate("#/tournament");

  // Hide submenu when mouse leaves the region
  root.addEventListener("mousemove", (e) => {
    const target = e.target as Node;
    const inside = submenu.contains(target) || playBtn.contains(target);
    if (!inside) hideSubmenu();
  });

  submenu.addEventListener("mouseleave", () => {
    hideSubmenu();
  });

  playBtn.addEventListener("mouseleave", (e) => {
    if (!submenu.contains(e.relatedTarget as Node)) {
      hideSubmenu();
    }
  });

  return () => {
  };
}
