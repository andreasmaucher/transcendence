// src/views/topbar/ui.ts
import "./topbar.css";

import { fetchMe, logout } from "../../api/http";
import { navigate } from "../../router/router";
import { setLanguage, getLanguage } from "../../i18n";
import { t } from "../../i18n";
import { connectToUserWS } from "../../ws/user";
import { teardownChat } from "../menu/ui";
import { onMatchStateChange } from "../../config/matchState";

let initialized = false;
let disconnectUserWS: (() => void) | null = null;
let unsubscribeMatchState: (() => void) | null = null;

export function initTopBar() {
  if (initialized) return;
  initialized = true;

  const topbar = document.createElement("div");
  topbar.id = "global-topbar";
  document.body.append(topbar);

  const langSwitcher = document.createElement("div");
  langSwitcher.id = "global-lang-switcher";
  topbar.append(langSwitcher);

  const userBox = document.createElement("div");
  userBox.id = "global-user-box";
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
    if (!submenu.contains(t) && !currentLangBtn.contains(t)) {
      submenu.style.display = "none";
    }
  });
}

/* ==========================================================
   USER BOX
========================================================== */

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
  avatar.width = 28;
  avatar.height = 28;
  avatar.style.borderRadius = "50%";
  avatar.style.objectFit = "cover";

  const name = document.createElement("span");
  name.textContent = me.username;

  userBox.append(avatar, name);

  /* USER SUBMENU -------------------------------------------------------- */

  const submenu = document.createElement("div");
  submenu.id = "global-user-submenu";
  document.body.append(submenu);

  const big = document.createElement("img");
  big.src = avatar.src;
  big.className = "submenu-avatar";

  const username = document.createElement("div");
  username.textContent = me.username;
  username.className = "user-name";

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
    teardownChat();
    clearUserBox(userBox);
    renderLoggedOut(userBox);
    navigate("#/login");
  };

  submenu.append(big, username, profileBtn, logoutBtn);

  // Subscribe to match state changes to hide user box during active matches
  if (unsubscribeMatchState) {
    unsubscribeMatchState();
  }
  
  unsubscribeMatchState = onMatchStateChange((isActive) => {
    // Hide entire user box during match, show when match is not active
    userBox.style.display = isActive ? "none" : "flex";
  });

  /* ==========================================================
     AUTO-POSITIONING (FIXES OVERFLOW RIGHT SIDE)
  =========================================================== */

  userBox.onmouseenter = () => {
    const rect = userBox.getBoundingClientRect();

    let left = rect.left;
    const top = rect.bottom;

    // Ensure submenu has computed width
    submenu.style.display = "flex";
    const menuWidth = submenu.offsetWidth;
    submenu.style.display = "none";

    const screenWidth = window.innerWidth;

    // Shift left if falling out on the right side
    if (left + menuWidth > screenWidth - 10) {
      left = screenWidth - menuWidth - 10;
    }

    submenu.style.left = left + "px";
    submenu.style.top = top + "px";
    submenu.style.display = "flex";
  };

  document.addEventListener("mousemove", (e) => {
    const t = e.target as Node;
    if (!submenu.contains(t) && !userBox.contains(t)) {
      submenu.style.display = "none";
    }
  });
}
