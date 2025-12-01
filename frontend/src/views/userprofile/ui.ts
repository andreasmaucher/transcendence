// src/views/userProfile/ui.ts
import { navigate } from "../../router/router";
import { t } from "../../i18n";

import {
  fetchUserPublic,
  fetchUserOnline,
  fetchUserMatches,
  fetchUserStats,
} from "../../api/http";

import { userData } from "../../config/constants";
import { API_BASE } from "../../config/endpoints";

export async function renderUserProfile(container: HTMLElement, username: string) {
  container.innerHTML = "";
  let cancelled = false;

  // ============================================================
  // Normalize nullable arrays so TypeScript STOPs complaining
  // ============================================================
  if (!Array.isArray(userData.friends)) userData.friends = [];
  if (!Array.isArray(userData.blockedUsers)) userData.blockedUsers = [];

  const friends = userData.friends;          // guaranteed string[]
  const blocked = userData.blockedUsers;     // guaranteed string[]

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
  title.textContent = `Profile: ${username}`;
  header.append(title);

  const back = document.createElement("button");
  back.className = "tournament-back-btn";
  back.textContent = t("profile.backToMenu");
  back.onclick = () => navigate("#/menu");
  header.append(back);

  // STATUS
  const status = document.createElement("div");
  status.className = "tournament-status";
  status.textContent = "Loading profile...";
  box.append(status);

  // CONTENT
  const content = document.createElement("div");
  content.className = "tournament-list";
  box.append(content);

  // =============================================================================
  // FETCH DATA
  // =============================================================================
  try {
    const [user, isOnline, stats, matches] = await Promise.all([
      fetchUserPublic(username),
      fetchUserOnline(username).catch(() => false),
      fetchUserStats(username).catch(() => null),
      fetchUserMatches(username).catch(() => []),
    ]);

    if (cancelled) return;

    status.textContent = "";
    content.innerHTML = "";

    // =============================================================================
    // AVATAR + USERNAME + STATUS
    // =============================================================================
    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.flexDirection = "column";
    headerRow.style.alignItems = "center";
    headerRow.style.marginBottom = "1rem";

    const avatar = document.createElement("img");
    avatar.src = user.avatar || "/default-avatar.png";
    avatar.width = 140;
    avatar.height = 140;
    avatar.style.borderRadius = "50%";
    avatar.style.border = "2px solid #ff2ea6";
    avatar.style.objectFit = "cover";
    avatar.style.marginBottom = "0.5rem";

    const name = document.createElement("div");
    name.textContent = user.username;
    name.style.fontSize = "22px";
    name.style.fontWeight = "bold";
    name.style.color = "#ff6bff";

    const onlineLabel = document.createElement("div");
    onlineLabel.textContent = isOnline ? "● Online" : "● Offline";
    onlineLabel.style.color = isOnline ? "#00ff99" : "#888";
    onlineLabel.style.marginTop = "4px";

    headerRow.append(avatar, name, onlineLabel);
    content.append(headerRow);

    // =============================================================================
    // FRIEND + CHALLENGE BUTTONS
    // =============================================================================
    if (user.username !== userData.username) {
      const actionRow = document.createElement("div");
      actionRow.style.display = "flex";
      actionRow.style.gap = "10px";
      actionRow.style.justifyContent = "center";
      actionRow.style.marginBottom = "1rem";

      // --------------------------
      // FRIEND BUTTON
      // --------------------------
      const isFriend = friends.includes(user.username);

      const friendBtn = document.createElement("button");
      friendBtn.className = "tournament-row-btn";
      friendBtn.textContent = isFriend ? "Remove Friend" : "Add Friend";

      friendBtn.onclick = async () => {
        friendBtn.disabled = true;

        try {
          if (isFriend) {
            await fetch(`${API_BASE}/api/user/remove-friend`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: userData.username,
                friend: user.username,
              }),
            });

            // Remove friend
            const idx = friends.indexOf(user.username);
            if (idx !== -1) friends.splice(idx, 1);

          } else {
            await fetch(`${API_BASE}/api/user/add-friend`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: userData.username,
                friend: user.username,
              }),
            });

            // Add friend
            friends.push(user.username);
          }

          const updated = friends.includes(user.username);
          friendBtn.textContent = updated ? "Remove Friend" : "Add Friend";

        } catch (err) {
          console.error(err);
        }

        friendBtn.disabled = false;
      };

      actionRow.append(friendBtn);

      // --------------------------
      // CHALLENGE BUTTON
      // --------------------------
      const challengeBtn = document.createElement("button");
      challengeBtn.className = "tournament-row-btn";
      challengeBtn.textContent = "⚔ Challenge";

      challengeBtn.onclick = () => {
        alert(`Challenge sent to ${user.username}!`);
      };

      actionRow.append(challengeBtn);

      content.append(actionRow);
    }

    // =============================================================================
    // STATS SECTION
    // =============================================================================
    const statsBox = document.createElement("div");
    statsBox.className = "tournament-row";
    statsBox.style.flexDirection = "column";
    statsBox.style.padding = "1rem";

    const statsTitle = document.createElement("h3");
    statsTitle.textContent = "Statistics";
    statsTitle.style.marginBottom = "0.5rem";

    const statContent = document.createElement("div");
    statContent.textContent = stats
      ? `Wins: ${stats.wins} | Losses: ${stats.losses} | Total: ${stats.totalMatches}`
      : "No stats available.";

    statsBox.append(statsTitle, statContent);
    content.append(statsBox);

    // =============================================================================
    // MATCH HISTORY SECTION
    // =============================================================================
    const matchesBox = document.createElement("div");
    matchesBox.className = "tournament-row";
    matchesBox.style.flexDirection = "column";
    matchesBox.style.padding = "1rem";
    matchesBox.style.marginTop = "1rem";

    const matchesTitle = document.createElement("h3");
    matchesTitle.textContent = "Match History";
    matchesTitle.style.marginBottom = "0.5rem";

    if (!matches || matches.length === 0) {
      const info = document.createElement("div");
      info.textContent = "No matches played.";
      matchesBox.append(matchesTitle, info);
    } else {
      const list = document.createElement("ul");
      list.style.listStyle = "none";
      list.style.padding = "0";

      matches.forEach((m: any) => {
        const li = document.createElement("li");
        li.style.padding = "4px 0";
        li.textContent = `${m.opponent} — ${m.result} (${m.score})`;
        list.append(li);
      });

      matchesBox.append(matchesTitle, list);
    }

    content.append(matchesBox);

  } catch (err: any) {
    status.textContent = "Failed to load profile.";
    console.error(err);
  }

  return () => {
    cancelled = true;
    back.onclick = null;
  };
}
