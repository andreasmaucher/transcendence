// src/views/online/ui.ts
import { navigate } from "../../router/router";
import { t } from "../../i18n";

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
  createBtn.onclick = () => {
    alert("Creating room…");
    console.log("TODO: create new online game via backend + open WS");
  };
  box.append(createBtn);

 
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

        // LEFT SIDE (game label)
        const left = document.createElement("div");
        left.textContent = `Game #${g.id}  —  Creator: ${g.player1}`;
        row.append(left);

        // RIGHT SIDE (buttons) same layout as tournament-right block
        const right = document.createElement("div");
        right.style.display = "flex";
        right.style.gap = "0.6rem";

        const joinBtn = document.createElement("button");
        joinBtn.className = "tournament-row-btn";
        joinBtn.textContent = "Join";
        joinBtn.onclick = () => navigate(`#/game?mode=online&id=${g.id}`);

        right.append(joinBtn);
        row.append(right);

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
