import { navigate } from "../../router/router";
import { t } from "../../i18n";
import { fetchAllUsers, fetchOnlineUsers, initChat } from "../../chat/chatView";
import "./menu.css";
import { API_BASE } from "../../config/endpoints";
import { generalData, userData } from "../../config/constants";

export let disposeChat: (() => void | Promise<void>) | null = null;

export function teardownChat() {
	disposeChat?.();
	disposeChat = null;
}

async function fetchAndLog() {
	try {
		const users = await fetch(`${API_BASE}/api/test/print-users`);
		const matches = await fetch(`${API_BASE}/api/test/print-matches`);
		const tournaments = await fetch(`${API_BASE}/api/test/print-tournaments`);
		const tournaments2 = await fetch(`${API_BASE}/api/test/print-tournaments2`);
		const tournamentPlayers = await fetch(`${API_BASE}/api/test/print-tournament-players`);
		const messages = await fetch(`${API_BASE}/api/test/print-messages`);

		if (!users.ok) console.error("Request failed:", users.status, users.statusText);
		else if (!matches.ok) console.error("Request failed:", matches.status, matches.statusText);
		else if (!tournaments.ok) console.error("Request failed:", tournaments.status, tournaments.statusText);
		else if (!tournaments2.ok) console.error("Request failed:", tournaments2.status, tournaments2.statusText);
		else if (!tournamentPlayers.ok)
			console.error("Request failed:", tournamentPlayers.status, tournamentPlayers.statusText);
		else if (!messages.ok) console.error("Request failed:", messages.status, messages.statusText);

		const usersData = await users.json();
		const matchesData = await matches.json();
		const tournamentsData = await tournaments.json();
		const tournaments2Data = await tournaments2.json();
		const tournamentPlayersData = await tournamentPlayers.json();
		const messagesData = await messages.json();

		const data = {
			users: usersData.data,
			matches: matchesData.data,
			tournaments: tournamentsData.data,
			tournaments2: tournaments2Data.data,
			tournamentPlayers: tournamentPlayersData.data,
			messages: messagesData.data,
		};
		console.log("Database:", data);
	} catch (err) {
		console.error("Fetch error:", err);
	}
}

export async function fetchGeneralData() {
	await fetchAllUsers();
	await fetchOnlineUsers();

	if (!generalData.allUsers || !generalData.onlineUsers) console.log("[MENU] Error fetching allUsers and onlineUsers");
}

fetchAndLog();
fetchGeneralData();

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
