// src/views/online/ui.ts
import { navigate } from "../../router/router";
import { t } from "../../i18n";
import { API_BASE } from "../../config/endpoints";

export function renderOnlineLobby(container: HTMLElement) {
  container.innerHTML = "";
  let cancelled = false;

  // SCREEN
  const root = document.createElement("div");
  root.className = "tournament-screen";
  container.append(root);


  // BOX

  const box = document.createElement("div");
  box.className = "tournament-box";
  root.append(box);


  const header = document.createElement("div");
  header.className = "tournament-header";
  box.append(header);

  const title = document.createElement("h1");
  title.className = "tournament-title";
  title.textContent = "Online Games";
  header.append(title);

  const backBtn = document.createElement("button");
  backBtn.className = "tournament-back-btn";
  backBtn.textContent = t("tournaments.back");
  backBtn.onclick = () => navigate("#/menu");
  header.append(backBtn);


  const status = document.createElement("div");
  status.className = "tournament-status";
  status.textContent = "Loading open games…";
  box.append(status);


  const list = document.createElement("div");
  list.className = "tournament-list";
  list.id = "online-game-list";
  box.append(list);


  const createBtn = document.createElement("button");
  createBtn.className = "tournament-create-btn";
  createBtn.textContent = "Create New Game";
  root.append(createBtn);

  // create new online game via backend + open WS (pin up a unique lobby/room ID whenever a user clicks “Create New Game”)
  createBtn.onclick = () => {
    const newGameId = self.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
    navigate(`#/game?mode=online&id=${newGameId}`);
  };
  box.append(createBtn);

 
  async function fetchOpenGames() {
    try {
      const res = await fetch(`${API_BASE}/api/single-games/open`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) return [];
      return json.data || [];
    } catch (err) {
      console.error("Failed to fetch open games:", err);
      return [];
    }
  }

  function refreshList(listEl: HTMLElement) {
    void fetchOpenGames().then((games) => {
      if (cancelled) return;

      listEl.innerHTML = "";

      if (!games.length) {
        status.textContent = "No open games";
        return;
      }

      status.textContent = `Available games: ${games.length}`;

      for (const g of games) {
        //
        // ROW 
        //
        const row = document.createElement("div");
        row.className = "tournament-row";

        const label = document.createElement("span");
        // display as "alice Game #1"
        const gameName = g.creator && g.gameNumber
          ? `${g.creator} Game #${g.gameNumber}`
          : `Game #${g.id}`;
        label.textContent = gameName;

        // RIGHT SIDE (buttons) same layout as tournament-right block
        const right = document.createElement("div");
        right.style.display = "flex";
        right.style.gap = "0.6rem";

        row.append(label);

        // "Join" button logic in the online lobby
        const joinBtn = document.createElement("button");
        joinBtn.className = "tournament-row-btn";
        joinBtn.textContent = "Join";
        joinBtn.onclick = () => navigate(`#/game?mode=online&id=${g.id}`);

        right.append(joinBtn);
        row.append(right);

        row.append(label, joinBtn);
        listEl.append(row);
      }
    });
  }

  refreshList(list);
  const interval = setInterval(() => refreshList(list), 2000);

  //
  //  WS INIT
  //
  function setupLobbySocket() {
    console.log("Lobby WS: TODO");
  }

  setupLobbySocket();

  //
  // CLEANUP
  //
  return () => {
    cancelled = true;
    clearInterval(interval);
    backBtn.onclick = null;
  };
}
