import { navigate } from "../../router/router";
import { fetchTournamentList, type Tournament } from "../../api/http";
import { t } from "../../i18n";
import "./tournament.css";

export async function renderTournament(container: HTMLElement) {
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

  // HEADER
  const header = document.createElement("div");
  header.className = "tournament-header";
  box.append(header);

  const title = document.createElement("h1");
  title.className = "tournament-title";
  title.textContent = t("tournaments.title");
  header.append(title);

  const backBtn = document.createElement("button");
  backBtn.className = "tournament-back-btn";
  backBtn.textContent = t("tournaments.back");
  backBtn.onclick = () => navigate("#/menu");
  header.append(backBtn);

  // STATUS
  const status = document.createElement("div");
  status.className = "tournament-status";
  status.textContent = t("tournaments.loading");
  box.append(status);

  // LIST
  const list = document.createElement("div");
  list.className = "tournament-list";
  box.append(list);

  // CREATE BUTTON
  const createBtn = document.createElement("button");
  createBtn.className = "tournament-create-btn";
  createBtn.textContent = t("tournaments.create");
  createBtn.onclick = () => alert("Tournament creation coming soon!");
  box.append(createBtn);

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
      row.className = "tournament-row";

      const left = document.createElement("div");
      left.textContent = tour.name || `Tournament #${tour.id}`;
      row.append(left);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.gap = "0.6rem";

      const detailsBtn = document.createElement("button");
      detailsBtn.className = "tournament-row-btn";
      detailsBtn.textContent = t("tournaments.details");
      detailsBtn.onclick = () => {
        alert(`Tournament details coming soon.\nID: ${tour.id}`);
      };

      const joinBtn = document.createElement("button");
      joinBtn.className = "tournament-row-btn";
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

  return () => {
    cancelled = true;
    backBtn.onclick = null;
  };
}
