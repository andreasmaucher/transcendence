// src/views/tournament/ui.ts
import { navigate } from "../../router/router";
import { fetchTournamentList, fetchMe, type Tournament } from "../../api/http";
import { t } from "../../i18n";

export async function renderTournament(container: HTMLElement) {
  container.innerHTML = "";
  let cancelled = false;

  // ROOT
  const root = document.createElement("div");
  root.className = "tournament-screen";
  container.append(root);

  // HEADER
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  root.append(header);

  const title = document.createElement("h1");
  title.textContent = t("tournaments.title");
  header.append(title);

  const backBtn = document.createElement("button");
  backBtn.textContent = t("tournaments.back");
  backBtn.onclick = () => navigate("#/menu");
  header.append(backBtn);

  // STATUS LINE
  const status = document.createElement("div");
  status.textContent = t("tournaments.loading");
  status.style.marginTop = "1rem";
  root.append(status);

  // LIST
  const list = document.createElement("div");
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "1rem";
  list.style.marginTop = "1.5rem";
  root.append(list);

  // CREATE BUTTON
  const createBtn = document.createElement("button");
  createBtn.textContent = t("tournaments.create");
  createBtn.style.marginTop = "2rem";
  createBtn.onclick = async () => {
    // generate a unique tournament ID and name
    const tournamentId = self.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
    const me = await fetchMe();
    const tournamentName = me ? `${me.username} Tournament` : `Tournament ${tournamentId.slice(0, 8)}`;
    //! LOGIC
    // navigate to game view in tournament mode (name will be passed via query params)
    navigate(`#/game?mode=tournament&id=${tournamentId}&name=${encodeURIComponent(tournamentName)}`);
  };
  root.append(createBtn);

  // LOAD LIST
  async function loadTournaments() {
    try {
      const tournaments = await fetchTournamentList();
      if (cancelled) return;

      list.innerHTML = "";

      if (!tournaments.length) {
        status.textContent = t("tournaments.none");
        const empty = document.createElement("div");
        empty.textContent = "No open tournaments";
        list.append(empty);
        return;
      }

      status.textContent = t("tournaments.available")(tournaments.length);

    tournaments.forEach((tour: Tournament) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.padding = "0.8rem";
      row.style.border = "1px solid #666";
      row.style.borderRadius = "6px";
      row.style.background = "rgba(0,0,0,0.4)";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.flexDirection = "column";
      left.style.gap = "0.3rem";
      
      const nameLine = document.createElement("div");
      nameLine.textContent = tour.name || `Tournament #${tour.id}`;
      nameLine.style.fontWeight = "bold";
      
      const statusLine = document.createElement("div");
      statusLine.textContent = `Players: ${tour.playersJoined}/${tour.state.size}`;
      statusLine.style.fontSize = "0.9rem";
      statusLine.style.color = "#aaa";
      
      left.append(nameLine, statusLine);
      row.append(left);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.gap = "0.5rem";

      const joinBtn = document.createElement("button");
      joinBtn.textContent = t("tournaments.join");
      joinBtn.onclick = () => {
        navigate(`#/game?mode=tournament&id=${tour.id}`);
      };

      right.append(joinBtn);
      row.append(right);

      list.append(row);
      });
    } catch (err) {
      if (!cancelled) {
        status.textContent = t("tournaments.failed");
      }
    }
  }

  loadTournaments();
  // refresh tournament list every 2 seconds
  const interval = setInterval(() => loadTournaments(), 2000);

  // CLEANUP
  return () => {
    cancelled = true;
    clearInterval(interval);
    backBtn.onclick = null;
  };
}
