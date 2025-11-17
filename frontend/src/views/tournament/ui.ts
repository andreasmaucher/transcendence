// src/views/tournament/ui.ts
import { navigate } from "../../router/router";
import { fetchTournamentList, type Tournament } from "../../api/http";
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
  createBtn.onclick = () => alert("Tournament creation coming soon!");
  root.append(createBtn);

  // LOAD LIST
  try {
    const tournaments = await fetchTournamentList();
    if (cancelled) return;

    if (!tournaments.length) {
      status.textContent = t("tournaments.none");
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
      left.textContent = tour.name || `Tournament #${tour.id}`;
      row.append(left);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.gap = "0.5rem";

      const detailsBtn = document.createElement("button");
      detailsBtn.textContent = t("tournaments.details");
      detailsBtn.onclick = () => {
        alert(`Tournament details coming soon.\nID: ${tour.id}`);
      };

      const joinBtn = document.createElement("button");
      joinBtn.textContent = t("tournaments.join");
      joinBtn.onclick = () => {
        alert("Joining tournaments not implemented yet.");
      };

      right.append(detailsBtn, joinBtn);
      row.append(right);

      list.append(row);
    });
  } catch (err) {
    if (!cancelled) {
      status.textContent = t("tournaments.failed");
    }
  }

  // CLEANUP
  return () => {
    cancelled = true;
    backBtn.onclick = null;
  };
}
