import { navigate } from "../../router/router";
import { t } from "../../i18n";
import { initChat } from "../../chat/chatView";
import "./menu.css";
import { API_BASE } from "../../config/endpoints";

export let disposeChat: (() => void | Promise<void>) | null = null;

export function teardownChat() {
	disposeChat?.();
	disposeChat = null;
}

async function fetchAndLog() {
	try {
		//Matches
		const res = await fetch(`${API_BASE}/api/test/print-users`, { credentials: "include" });

		if (!res.ok) {
			console.error("Request failed:", res.status, res.statusText);
			return;
		}

		const data = await res.json();
		console.log("Users:", data.data);

		//Matches
		const res1 = await fetch(`${API_BASE}/api/test/print-matches`, { credentials: "include" });

		if (!res1.ok) {
			console.error("Request failed:", res1.status, res1.statusText);
			return;
		}

		const data1 = await res1.json();
		console.log("Matches:", data1.data);

		// Tournaments
		const res2 = await fetch(`${API_BASE}/api/test/print-tournaments`, { credentials: "include" });

		if (!res2.ok) {
			console.error("Request failed:", res2.status, res2.statusText);
			return;
		}

		const data2 = await res2.json();
		console.log("Tournaments:", data2.data);

		// Tournaments2
		const res3 = await fetch(`${API_BASE}/api/test/print-tournaments2`, { credentials: "include" });

		if (!res3.ok) {
			console.error("Request failed:", res3.status, res3.statusText);
			return;
		}

		const data3 = await res3.json();
		console.log("Tournaments2:", data3.data);

		// Tournament players
		const res4 = await fetch(`${API_BASE}/api/test/print-tournament-players`, { credentials: "include" });

		if (!res4.ok) {
			console.error("Request failed:", res4.status, res4.statusText);
			return;
		}

		const data4 = await res4.json();
		console.log("Tournament players:", data4.data);
	} catch (err) {
		console.error("Fetch error:", err);
	}
}

fetchAndLog();

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
	return () => {
		teardownChat();
	};
}
