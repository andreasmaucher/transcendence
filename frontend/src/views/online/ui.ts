// src/views/online/ui.ts
import { navigate } from "../../router/router";
import { t } from "../../i18n";

export function renderOnlineLobby(container: HTMLElement) {
  container.innerHTML = "";

  const root = document.createElement("div");
  container.append(root);

  const title = document.createElement("h1");
  title.textContent = "Online Games";
  root.append(title);

  const backBtn = document.createElement("button");
  backBtn.textContent = "Back";
  backBtn.onclick = () => navigate("#/menu");
  root.append(backBtn);

  const createBtn = document.createElement("button");
  createBtn.textContent = "Create New Game";
  root.append(createBtn);

  createBtn.onclick = () => {
    alert("Creating room…");
    console.log("TODO: create new online game via backend + open WS");
  };

  const list = document.createElement("div");
  list.id = "online-game-list";
  root.append(list);

  async function fetchOpenGames() {
    try {
      const res = await fetch("/api/single-games/open");
      const json = await res.json();
      if (!json.success) return [];
      return json.data || [];
    } catch {
      return [];
    }
  }

  function refreshList(listEl: HTMLElement) {
    void fetchOpenGames().then((games) => {
      listEl.innerHTML = "";

      if (games.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "No open games";
        listEl.append(empty);
        return;
      }

      for (const g of games) {
        const row = document.createElement("div");

        const label = document.createElement("span");
        label.textContent = `Game #${g.id}`;

        const owner = document.createElement("span");
        owner.textContent = `Creator: ${g.player1}`;

        const joinBtn = document.createElement("button");
        joinBtn.textContent = "Join";
        joinBtn.onclick = () => {
          navigate(`#/game?mode=online&id=${g.id}`);
        };

        row.append(label, owner, joinBtn);
        listEl.append(row);
      }
    });
  }

  refreshList(list);
  const interval = setInterval(() => refreshList(list), 2000);

  function setupLobbySocket() {
    console.log("Lobby WS: TODO");
  }

  setupLobbySocket();

  return () => {
    clearInterval(interval);
  };
}
