// src/views/topbar/ui.ts
import { fetchMe, logout } from "../../api/http";
import { navigate } from "../../router/router";
import { setLanguage, getLanguage } from "../../i18n";
import { t } from "../../i18n";
import { connectToUserWS } from "../../ws/user";

let initialized = false;
let disconnectUserWS: (() => void) | null = null;

export function initTopBar() {
	if (initialized) return;
	initialized = true;

	const topbar = document.createElement("div");
	topbar.id = "global-topbar";
	topbar.style.position = "fixed";
	topbar.style.top = "20px";
	topbar.style.right = "20px";
	topbar.style.display = "flex";
	topbar.style.alignItems = "center";
	topbar.style.gap = "12px";
	topbar.style.zIndex = "9999";
	document.body.append(topbar);

	const langSwitcher = document.createElement("div");
	langSwitcher.id = "global-lang-switcher";
	langSwitcher.style.display = "flex";
	langSwitcher.style.gap = "6px";
	topbar.append(langSwitcher);

	const userBox = document.createElement("div");
	userBox.id = "global-user-box";
	userBox.style.display = "flex";
	userBox.style.alignItems = "center";
	userBox.style.gap = "8px";
	userBox.style.background = "rgba(0,0,0,0.5)";
	userBox.style.padding = "4px 8px";
	userBox.style.borderRadius = "6px";
	userBox.style.color = "#fff";
	userBox.style.cursor = "pointer";
	topbar.append(userBox);

	setupLanguageUI(langSwitcher);
	updateTopBar();
}

export async function updateTopBar() {
	const userBox = document.getElementById("global-user-box") as HTMLDivElement;
	if (!userBox) return;

	const me = await fetchMe().catch(() => null);

	if (disconnectUserWS) {
		disconnectUserWS();
		disconnectUserWS = null;
	}

	clearUserBox(userBox);

	if (!me) {
		renderLoggedOut(userBox);
	} else {
		renderLoggedIn(userBox, me);
		disconnectUserWS = connectToUserWS(me.username);
	}
}

function setupLanguageUI(langSwitcher: HTMLDivElement) {
	const currentLangBtn = document.createElement("button");
	currentLangBtn.textContent = getLanguage().toUpperCase();
	langSwitcher.append(currentLangBtn);

	const submenu = document.createElement("div");
	submenu.id = "global-lang-submenu";
	submenu.style.position = "fixed";
	submenu.style.display = "none";
	submenu.style.flexDirection = "column";
	submenu.style.gap = "8px";
	submenu.style.padding = "10px";
	submenu.style.background = "rgba(0,0,0,0.7)";
	submenu.style.border = "1px solid #777";
	submenu.style.borderRadius = "6px";
	submenu.style.zIndex = "10000";
	submenu.style.minWidth = "10px";
	submenu.style.alignItems = "center";
	submenu.style.justifyContent = "center";
	submenu.style.textAlign = "center";

	document.body.append(submenu);

	function addLang(code: "en" | "de" | "fr", label: string) {
		const btn = document.createElement("button");
		btn.textContent = label;
		btn.onclick = () => {
			setLanguage(code);
			currentLangBtn.textContent = code.toUpperCase();
			updateTopBar();
			navigate(location.hash);
			submenu.style.display = "none";
		};
		submenu.append(btn);
	}

	addLang("en", "EN");
	addLang("de", "DE");
	addLang("fr", "FR");

	currentLangBtn.onmouseenter = () => {
		const rect = currentLangBtn.getBoundingClientRect();
		submenu.style.left = rect.left + "px";
		submenu.style.top = rect.bottom + "px";
		submenu.style.display = "flex";
	};

	document.addEventListener("mousemove", (e) => {
		const t = e.target as Node;
		if (!submenu.contains(t) && !currentLangBtn.contains(t)) submenu.style.display = "none";
	});
}

function clearUserBox(userBox: HTMLDivElement) {
	userBox.innerHTML = "";
	const old = document.getElementById("global-user-submenu");
	if (old) old.remove();
}

function renderLoggedOut(userBox: HTMLDivElement) {
	userBox.textContent = t("topbar.login");
	userBox.onclick = () => navigate("#/login");
}

function renderLoggedIn(userBox: HTMLDivElement, me: any) {
	const avatar = document.createElement("img");
	avatar.src = me.avatar || "/default-avatar.png";
	avatar.width = 32;
	avatar.height = 32;
	avatar.style.borderRadius = "50%";
	avatar.style.objectFit = "cover";

	const name = document.createElement("span");
	name.textContent = me.username;

	userBox.append(avatar, name);

	const submenu = document.createElement("div");
	submenu.id = "global-user-submenu";
	submenu.style.position = "fixed";
	submenu.style.display = "none";
	submenu.style.flexDirection = "column";
	submenu.style.gap = "8px";
	submenu.style.padding = "10px";
	submenu.style.background = "rgba(0,0,0,0.7)";
	submenu.style.border = "1px solid #777";
	submenu.style.borderRadius = "6px";
	submenu.style.zIndex = "10000";
	submenu.style.minWidth = "80px";
	submenu.style.alignItems = "center";

	document.body.append(submenu);

	const big = document.createElement("img");
	big.src = avatar.src;
	big.width = 60;
	big.height = 60;
	big.style.borderRadius = "50%";
	big.style.objectFit = "cover";
	big.style.border = "2px solid #ff2ea6";

	const username = document.createElement("div");
	username.textContent = me.username;
	username.style.color = "#fff";

	const profileBtn = document.createElement("button");
	profileBtn.textContent = t("topbar.editProfile");
	profileBtn.onclick = () => {
		navigate("#/profile");
		submenu.style.display = "none";
	};

	const logoutBtn = document.createElement("button");
	logoutBtn.textContent = t("topbar.logout");
	logoutBtn.onclick = async () => {
		await logout({ username: me.username });
		if (disconnectUserWS) {
			disconnectUserWS();
			disconnectUserWS = null;
		}
		clearUserBox(userBox);
		renderLoggedOut(userBox);
		navigate("#/login");
	};

	submenu.append(big, username, profileBtn, logoutBtn);

	userBox.onmouseenter = () => {
		const rect = userBox.getBoundingClientRect();
		submenu.style.left = rect.left + "px";
		submenu.style.top = rect.bottom + "px";
		submenu.style.display = "flex";
	};

	document.addEventListener("mousemove", (e) => {
		const t = e.target as Node;
		if (!submenu.contains(t) && !userBox.contains(t)) submenu.style.display = "none";
	});
}
