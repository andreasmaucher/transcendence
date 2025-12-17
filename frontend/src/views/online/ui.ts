import { navigate } from "../../router/router";
import { t } from "../../i18n";
import { API_BASE } from "../../config/endpoints";
import { initChat } from "../../chat/chatView";

export let disposeChat: (() => void | Promise<void>) | null = null;

export function teardownChat() {
	disposeChat?.();
	disposeChat = null;
}

export async function renderOnlineLobby(container: HTMLElement) {
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
	title.textContent = t("online.title");
	header.append(title);

	const backBtn = document.createElement("button");
	backBtn.className = "tournament-back-btn";
	backBtn.textContent = t("tournaments.back");
	backBtn.onclick = () => navigate("#/menu");
	header.append(backBtn);

	const status = document.createElement("div");
	status.className = "tournament-status";
	status.textContent = t("online.loading");
	box.append(status);

	const list = document.createElement("div");
	list.className = "tournament-list";
	list.id = "online-game-list";
	box.append(list);

	const createBtn = document.createElement("button");
	createBtn.className = "tournament-create-btn";
	createBtn.textContent = t("online.createGame");
	root.append(createBtn);

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
				status.textContent = t("online.none");
				return;
			}

			status.textContent = `${t("online.available")} ${games.length}`;

			for (const g of games) {
				const row = document.createElement("div");
				row.className = "tournament-row";

				const label = document.createElement("span");
				const gameName = g.name || `${t("online.game")} ${g.id.substring(0, 8)}`;
				label.textContent = gameName;

				const right = document.createElement("div");
				right.style.display = "flex";
				right.style.gap = "0.6rem";

				row.append(label);

				const joinBtn = document.createElement("button");
				joinBtn.className = "tournament-row-btn";
				joinBtn.textContent = t("online.join");
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

	function setupLobbySocket() {
		console.log("Lobby WS: TODO");
	}

	setupLobbySocket();
	disposeChat = await initChat();
	return () => {
		cancelled = true;
		clearInterval(interval);
		backBtn.onclick = null;
		teardownChat();
	};
}
