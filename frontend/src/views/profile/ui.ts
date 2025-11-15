import { navigate } from "../../router/router";
import { fetchMe } from "../../api/http";

export function renderProfile(container: HTMLElement) {
  container.replaceChildren();

  let cancelled = false;

  const title = document.createElement("h1");
  title.textContent = "Profile";

  const info = document.createElement("div");
  info.textContent = "Loading profile...";
  container.append(title, info);

  const backBtn = document.createElement("button");
  backBtn.textContent = "← Back to Menu";
  const onBack = () => navigate("#/menu");
  backBtn.addEventListener("click", onBack);
  container.append(backBtn);

  (async () => {
    try {
      const me = await fetchMe();
      if (cancelled) return;

      if (!me) {
        info.textContent = "You are not logged in.";
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.style.marginTop = "1rem";
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.alignItems = "center";
      wrapper.style.gap = "0.5rem";

      const avatar = document.createElement("img");
      avatar.alt = "User avatar";
      avatar.width = 120;
      avatar.height = 120;
      avatar.style.borderRadius = "50%";
      avatar.style.objectFit = "cover";
      avatar.style.border = "2px solid #ff2ea6";
      avatar.src =
        me.avatar && me.avatar.startsWith("http")
          ? me.avatar
          : `${me.avatar ?? ""}` || "/default-avatar.png";

      const username = document.createElement("h2");
      username.textContent = me.username;

      const userId = document.createElement("p");
      userId.textContent = `ID: ${me.id}`;

      const joined = document.createElement("p");
      joined.textContent = `Joined: ${new Date(me.created_at).toLocaleString()}`;

      wrapper.append(avatar, username, userId, joined);
      info.replaceChildren(wrapper);

    } catch (e) {
      if (!cancelled) info.textContent = "Failed to load profile data.";
    }
  })();

  // CLEANUP
  return () => {
    cancelled = true;
    backBtn.removeEventListener("click", onBack);
  };
}
