// src/views/menu/ui.ts
import { navigate } from "../../router/router";
import { fetchMe, logout } from "../../api/http";

export function renderMenu(container: HTMLElement) {
  container.innerHTML = "";
  let cancelled = false;

  const root = document.createElement("div");
  root.className = "menu-screen";
  container.append(root);

  // --- Title ---
  const title = document.createElement("h1");
  title.textContent = "PONG";
    title.style.textAlign = "center";
    title.style.width = "100%";
  root.append(title);

  // --- User Display 
  const userInfo = document.createElement("div");
  userInfo.className = "menu-user";
  userInfo.textContent = "Loading…";
  userInfo.style.cursor = "pointer";
  root.append(userInfo);

    userInfo.style.position = "absolute";
    userInfo.style.top = "100px";
    userInfo.style.right = "100px";
  (async () => {
    const me = await fetchMe();
    if (!me || cancelled) return navigate("#/login");

    const avatar = document.createElement("img");
    avatar.src = me.avatar || "/default-avatar.png";
    avatar.width = 32;
    avatar.height = 32;
    avatar.style.borderRadius = "50%";
    avatar.style.objectFit = "cover";
    avatar.style.marginRight = "8px";

    userInfo.innerHTML = "";
    userInfo.append(avatar, me.username);
  })();

  // --- Buttonss
  const btns = document.createElement("div");
  btns.className = "menu-buttons";
  btns.style.justifyContent = "center";

  root.append(btns);

  const playBtn = document.createElement("button");
  playBtn.textContent = "Play Game";

  const tournamentBtn = document.createElement("button");
  tournamentBtn.textContent = "Tournaments";

  const logoutBtn = document.createElement("button");
  logoutBtn.textContent = "Logout";

  btns.append(playBtn, tournamentBtn);

  // --- Shared floating submenu ---
  const submenu = document.createElement("div");
  submenu.className = "submenu";
  submenu.style.position = "absolute";
  submenu.style.display = "none";
  submenu.style.flexDirection = "column";
  submenu.style.gap = "8px";
  submenu.style.padding = "10px";
  submenu.style.background = "rgba(0,0,0,0.7)";
  submenu.style.border = "1px solid #777";
  submenu.style.borderRadius = "6px";
  submenu.style.zIndex = "9999";
  root.append(submenu);

  function showSubmenu(content: HTMLElement, anchor: HTMLElement) {
    submenu.innerHTML = "";
    submenu.append(content);

    const rect = anchor.getBoundingClientRect();
    submenu.style.left = rect.left + "px";
    submenu.style.top = rect.bottom + "px";
    submenu.style.display = "flex";
  }

  function hideSubmenu() {
    submenu.style.display = "none";
  }

  // PLAY GAME Hover submenu
  playBtn.onmouseenter = () => {
    const box = document.createElement("div");
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.gap = "6px";

    const localBtn = document.createElement("button");
    localBtn.textContent = "Local Match";
    localBtn.onclick = () => navigate("#/game?mode=local");

    const onlineBtn = document.createElement("button");
    onlineBtn.textContent = "Online Match";
    onlineBtn.onclick = () => navigate("#/game?mode=online");

    box.append(localBtn, onlineBtn);

    showSubmenu(box, playBtn);
  };

  // TOURNAMENT Hover submenu
  tournamentBtn.onmouseenter = () => {
    const box = document.createElement("div");
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.gap = "6px";

    tournamentBtn.onclick = () => navigate("#/tournament");

  };

  // USER Hover submenu 
  userInfo.onmouseenter = async () => {
    const me = await fetchMe();
    if (!me) return;

    const box = document.createElement("div");
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.alignItems = "center";
    box.style.gap = "8px";

    const avatar = document.createElement("img");
    avatar.src = me.avatar || "/default-avatar.png";
    avatar.width = 60;
    avatar.height = 60;
    avatar.style.borderRadius = "50%";
    avatar.style.objectFit = "cover";
    avatar.style.border = "2px solid #ff2ea6";

    const name = document.createElement("div");
    name.textContent = me.username;

    const editBtn = document.createElement("button");
  // USER Hover submenu → Profile Info + Edit
    editBtn.textContent = "Edit Profile";
    editBtn.onclick = () => navigate("#/profile");

    const logoutInsideBtn = document.createElement("button");
    logoutInsideBtn.textContent = "Logout";
    logoutInsideBtn.onclick = async () => {
        try {
        const me = await fetchMe();
        if (me) await logout({ username: me.username });
        } finally {
        navigate("#/login");
        }
    };

    box.append(avatar, name, editBtn, logoutInsideBtn);

    showSubmenu(box, userInfo);
  };

  // Hide submenu when mouse leaves the region
  root.addEventListener("mousemove", (e) => {
    const inside = submenu.contains(e.target as Node);
    const overPlay = playBtn.contains(e.target as Node);
    const overTournament = tournamentBtn.contains(e.target as Node);
    const overUser = userInfo.contains(e.target as Node);

    if (!inside && !overPlay && !overTournament && !overUser) {
      hideSubmenu();
    }
  });

    logoutBtn.onclick = async () => {
        try {
        const me = await fetchMe();
        if (me) await logout({ username: me.username });
        } finally {
        navigate("#/login");
        }
    };
    submenu.addEventListener("mouseleave", () => {
    hideSubmenu();
    });

    playBtn.addEventListener("mouseleave", (e) => {
    if (!submenu.contains(e.relatedTarget as Node)) {
        hideSubmenu();
    }
    });

    userInfo.addEventListener("mouseleave", (e) => {
    if (!submenu.contains(e.relatedTarget as Node)) {
        hideSubmenu();
    }
    });


  return () => {
    cancelled = true;
  };
}

