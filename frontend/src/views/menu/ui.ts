import { navigate } from "../../router/router";
import { fetchMe, logout } from "../../api/http";

export function renderMenu(container: HTMLElement) {
  container.replaceChildren();

  let cancelled = false;

  const root = document.createElement("div");
  root.className = "menu-screen";

  const title = document.createElement("h1");
  title.className = "menu-title";
  title.textContent = "Main Menu";

  const userInfo = document.createElement("div");
  userInfo.className = "menu-user";

  root.append(title, userInfo);
  container.append(root);

  userInfo.textContent = "Loading...";

  (async () => {
    try {
      const me = await fetchMe();
      if (cancelled) return;

      if (!me) {
        navigate("#/login");
        return;
      }

      userInfo.textContent = `👤 ${me.username}`;
    } catch {
      if (!cancelled) navigate("#/login");
    }
  })();

  const btns = document.createElement("div");
  btns.className = "menu-buttons";

  const playBtn = document.createElement("button");
  playBtn.textContent = "Play Game";

  const tournamentBtn = document.createElement("button");
  tournamentBtn.textContent = "Tournaments";

  const profileBtn = document.createElement("button");
  profileBtn.textContent = "Profile";

  const logoutBtn = document.createElement("button");
  logoutBtn.textContent = "Logout";

  const onPlay = () => navigate("#/game");
  const onTournament = () => alert("Tournament list coming soon!");
  const onProfile = () => navigate("#/profile");
  const onLogout = async () => {
    try { await logout(); }
    catch (err) { console.warn("Logout failed:", err); }
    finally { navigate("#/login"); }
  };

  playBtn.addEventListener("click", onPlay);
  tournamentBtn.addEventListener("click", onTournament);
  profileBtn.addEventListener("click", onProfile);
  logoutBtn.addEventListener("click", onLogout);

  btns.append(playBtn, tournamentBtn, profileBtn, logoutBtn);
  root.append(btns);

  // cleanup
  return () => {
    cancelled = true;
    playBtn.removeEventListener("click", onPlay);
    tournamentBtn.removeEventListener("click", onTournament);
    profileBtn.removeEventListener("click", onProfile);
    logoutBtn.removeEventListener("click", onLogout);
  };
}
