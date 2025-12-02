import "./userProfile.css";
import { navigate } from "../../router/router";
import { t } from "../../i18n";
import { fetchUserPublic } from "../../api/http";
import { userData } from "../../config/constants";
import { API_BASE } from "../../config/endpoints";
import { sendMessage } from "../../chat/chatHandler";

export async function renderUserProfile(container: HTMLElement, username?: string) {
  container.innerHTML = "";
  let cancelled = false;

  // Load actual data
  try {
    const meRes = await fetch(`${API_BASE}/api/user/data`, { credentials: "include" });
    const meBody = await meRes.json();
    if (meBody.success) {
      userData.friends = meBody.data.friends ?? [];
      userData.blockedUsers = meBody.data.blockedUsers ?? [];
    }
  } catch (e) {}

  // ROOT
  const root = document.createElement("div");
  root.className = "user-profile-root";
  container.append(root);

  // MAIN CARD
  const card = document.createElement("div");
  card.className = "user-profile-card";
  root.append(card);

  // HEADER
  const header = document.createElement("div");
  header.className = "user-profile-header";
  card.append(header);

  const title = document.createElement("h1");
  title.className = "user-profile-title";
  title.textContent = t("userProfile.title");
  header.append(title);

  const back = document.createElement("button");
  back.className = "user-profile-back";
  back.textContent = t("profile.backToMenu");
  back.onclick = () => navigate("#/menu");
  header.append(back);

  // STATUS
  const status = document.createElement("div");
  status.textContent = t("userProfile.loading");
  card.append(status);

  try {
    const user = await fetchUserPublic(username!);
    if (cancelled) return;

    status.remove();

    // TOP PROFILE CARD
    const top = document.createElement("div");
    top.className = "profile-top-card";
    card.append(top);

    const avatar = document.createElement("img");
    avatar.className = "profile-avatar";
    avatar.src = user.avatar || "/default-avatar.png";
    top.append(avatar);

    const name = document.createElement("div");
    name.className = "profile-name";
    name.textContent = user.username;
    top.append(name);

    const joined = document.createElement("div");
    joined.className = "profile-joined";
    joined.textContent = t("userProfile.joined") + new Date(user.created_at).toLocaleDateString();
    top.append(joined);

    // ACTION BUTTONS
    if (user.username !== userData.username) {
      const actions = document.createElement("div");
      actions.className = "profile-actions";
      card.append(actions);

      // FRIEND BTN
      const friendBtn = document.createElement("button");
      friendBtn.className = "profile-action-btn";
      friendBtn.textContent = userData.friends.includes(user.username)
        ? t("userProfile.removeFriend")
        : t("userProfile.addFriend");

      friendBtn.onclick = async () => {
        friendBtn.disabled = true;

        try {
          const isFriend = userData.friends.includes(user.username);

          await fetch(`${API_BASE}/api/user/${isFriend ? "remove-friend" : "add-friend"}`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: userData.username, friend: user.username })
          });

          const res = await fetch(`${API_BASE}/api/user/data`, { credentials: "include" });
          const body = await res.json();
          if (body.success) userData.friends = body.data.friends;

          friendBtn.textContent = userData.friends.includes(user.username)
            ? t("userProfile.removeFriend")
            : t("userProfile.addFriend");
        } catch {}
        friendBtn.disabled = false;
      };

      actions.append(friendBtn);

      // BLOCK BTN
      const blockBtn = document.createElement("button");
      blockBtn.className = "profile-action-btn secondary";
      blockBtn.textContent = userData.blockedUsers.includes(user.username)
        ? t("userProfile.unblock")
        : t("userProfile.block");

      blockBtn.onclick = () => {
        const isBlocked = userData.blockedUsers.includes(user.username);
        if (isBlocked) {
          userData.blockedUsers = userData.blockedUsers.filter(b => b !== user.username);
          sendMessage("unblock", t("userProfile.youUnblocked") + user.username, user.username);
          blockBtn.textContent = t("userProfile.block");
        } else {
          userData.blockedUsers.push(user.username);
          sendMessage("block", t("userProfile.youBlocked") + user.username, user.username);
          blockBtn.textContent = t("userProfile.unblock");
        }
      };

      actions.append(blockBtn);
    }

    // FRIEND LIST
    const friendCard = document.createElement("div");
    friendCard.className = "profile-section-card";
    card.append(friendCard);

    const fTitle = document.createElement("div");
    fTitle.className = "profile-section-title";
    fTitle.textContent = t("userProfile.friends");
    friendCard.append(fTitle);

    const friendList = document.createElement("div");
    friendList.className = "profile-friends-list";
    friendCard.append(friendList);

    let friendsParsed: string[] = [];
    try { if (typeof user.friends === "string") friendsParsed = JSON.parse(user.friends); } catch {}

    if (friendsParsed.length === 0) {
      const none = document.createElement("div");
      none.className = "profile-no-friends";
      none.textContent = t("userProfile.noFriends");
      friendList.append(none);
    } else {
      for (const friend of friendsParsed) {
        const row = document.createElement("div");
        row.className = "profile-friend-row";
        row.onclick = () => navigate(`#/user/${friend}`);

        const avatarImg = document.createElement("img");
        avatarImg.className = "profile-friend-avatar";
        avatarImg.src = "/default-avatar.png";

        fetch(`${API_BASE}/api/user/${friend}`, { credentials: "include" })
          .then(r => r.json())
          .then(b => { if (b.success && b.data.avatar) avatarImg.src = b.data.avatar; });

        const uname = document.createElement("span");
        uname.className = "profile-friend-name";
        uname.textContent = friend;

        row.append(avatarImg, uname);
        friendList.append(row);
      }
    }

  } catch (err) {
    status.textContent = t("userProfile.failedLoad");
  }

  return () => {
    cancelled = true;
    back.onclick = null;
  };
}
