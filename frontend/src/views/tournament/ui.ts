import { navigate } from "../../router/router";
import { fetchTournamentList, fetchMe, type Tournament } from "../../api/http";
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

	// CREATE BUTTON INSIDE BOX
	const createBtn = document.createElement("button");
	createBtn.className = "tournament-create-btn";
	createBtn.textContent = t("tournaments.create");
	createBtn.onclick = async () => {
		const tournamentId = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
		const me = await fetchMe();
		const tournamentName = me
			? `${me.username} Tournament`
			: `Tournament ${tournamentId.slice(0, 8)}`;

		navigate(
			`#/game?mode=tournament&id=${tournamentId}&name=${encodeURIComponent(
				tournamentName
			)}`
		);
	};
	box.append(createBtn);

	// LOAD FUNCTION
	async function loadTournaments() {
		try {
			const tournaments = await fetchTournamentList();
			if (cancelled) return;

			list.innerHTML = "";

			if (!tournaments.length) {
				status.textContent = t("tournaments.none");

				const empty = document.createElement("div");
				empty.style.opacity = "0.8";
				empty.textContent = "";
				list.append(empty);

				return;
			}

			status.textContent = t("tournaments.available")(tournaments.length);

			tournaments.forEach((tour: Tournament) => {
				const row = document.createElement("div");
				row.className = "tournament-row";

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
				joinBtn.className = "tournament-row-btn";
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

	// AUTO REFRESH
	const interval = setInterval(() => loadTournaments(), 2000);

	return () => {
		cancelled = true;
		clearInterval(interval);
		backBtn.onclick = null;
	};
}
