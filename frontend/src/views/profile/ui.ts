import "./profile.css";
import { fetchMe, updateUser } from "../../api/http";
import { navigate } from "../../router/router";
import { updateTopBar } from "../topbar/ui";
import { t } from "../../i18n";
import { userData } from "../../config/constants";
import { API_BASE } from "../../config/endpoints";

export async function renderProfile(container: HTMLElement) {
  container.innerHTML = "";
  let cancelled = false;

  const root = document.createElement("div");
  root.className = "profile-screen";
  container.append(root);

  const panel = document.createElement("div");
  panel.className = "profile-panel";
  root.append(panel);

  const header = document.createElement("div");
  header.className = "profile-header";
  panel.append(header);

  const title = document.createElement("h1");
  title.textContent = t("profile.title");
  header.append(title);

  const back = document.createElement("button");
  back.className = "profile-back-btn";
  back.textContent = t("profile.backToMenu");
  back.onclick = () => navigate("#/menu");
  header.append(back);

  const status = document.createElement("div");
  status.className = "profile-status";
  status.textContent = t("profile.loading");
  panel.append(status);

  const content = document.createElement("div");
  content.className = "profile-content";
  panel.append(content);

  (async () => {
    const me = await fetchMe();
    if (!me || cancelled) {
      status.textContent = t("profile.notLoggedIn");
      return;
    }

    status.textContent = "";
    content.innerHTML = "";

    let username = me.username;
    let avatarSrc = me.avatar || "/default-avatar.png";

    // ============================================================
    // CARD: AVATAR + BASIC INFO
    // ============================================================
    const avatarCard = document.createElement("div");
    avatarCard.className = "profile-card";
    content.append(avatarCard);

    const avatarWrapper = document.createElement("div");
    avatarWrapper.className = "profile-avatar-wrapper";

    const avatar = document.createElement("img");
    avatar.src = avatarSrc;
    avatar.className = "profile-avatar";

    const avatarInput = document.createElement("input");
    avatarInput.type = "file";
    avatarInput.accept = "image/*";
    avatarInput.style.display = "none";

    const overlayBtn = document.createElement("div");
    overlayBtn.className = "profile-avatar-edit";
    overlayBtn.textContent = "✎";
    overlayBtn.onclick = () => avatarInput.click();

    avatarInput.onchange = async () => {
      const file = avatarInput.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        avatarSrc = reader.result as string;
        avatar.src = avatarSrc;

        try {
          await updateUser({ username, newAvatar: avatarSrc });
          await updateTopBar();
        } catch (e) {
          console.error("Failed to update avatar", e);
        }
      };
      reader.readAsDataURL(file);
    };

    avatarWrapper.append(avatar, overlayBtn, avatarInput);

    const uname = document.createElement("div");
    uname.className = "profile-username";
    uname.textContent = username;

    const joined = document.createElement("div");
    joined.className = "profile-subtext";
    joined.textContent =
      t("profile.joined") + new Date(me.created_at).toLocaleDateString();

    avatarCard.append(avatarWrapper, uname, joined);

    // ============================================================
    // CARD: CHANGE PASSWORD
    // ============================================================
    const passCard = document.createElement("div");
    passCard.className = "profile-card";
    content.append(passCard);

    const passHeader = document.createElement("div");
    passHeader.className = "profile-section-title";
    passHeader.textContent = t("profile.changePassword");
    passCard.append(passHeader);

    const passSection = document.createElement("div");
    passSection.style.display = "flex";
    passSection.style.flexDirection = "column";
    passCard.append(passSection);

    const newPass = document.createElement("input");
    newPass.type = "password";
    newPass.placeholder = t("profile.newPassword");
    newPass.className = "profile-input";

    const confirmPass = document.createElement("input");
    confirmPass.type = "password";
    confirmPass.placeholder = t("profile.confirmPassword");
    confirmPass.className = "profile-input";

    const passSave = document.createElement("button");
    passSave.className = "profile-btn";
    passSave.textContent = t("profile.savePassword");

    const passMsg = document.createElement("div");
    passMsg.className = "profile-message";

    passSave.onclick = async () => {
      passSave.disabled = true;
      passMsg.textContent = "";

      try {
        if (newPass.value !== confirmPass.value) {
          passMsg.textContent = t("profile.passwordsNoMatch");
          passSave.disabled = false;
          return;
        }

        if (newPass.value.length < 4) {
          passMsg.textContent = t("profile.passwordTooShort");
          passSave.disabled = false;
          return;
        }

        await updateUser({ username, newPassword: newPass.value });
        passMsg.textContent = t("profile.saved");
        newPass.value = "";
        confirmPass.value = "";
      } catch (e) {
        passMsg.textContent = t("profile.updateFailed");
      }

      passSave.disabled = false;
    };

    passSection.append(newPass, confirmPass, passSave, passMsg);

    // ============================================================
    // CARD: FRIEND LIST
    // ============================================================
    const friendsCard = document.createElement("div");
    friendsCard.className = "profile-card";
    content.append(friendsCard);

    const fTitle = document.createElement("div");
    fTitle.className = "profile-section-title";
    fTitle.textContent = t("profile.friends");
    friendsCard.append(fTitle);

    if (!userData.friends?.length) {
      const none = document.createElement("div");
      none.textContent = t("profile.noFriends");
      none.className = "profile-subtext";
      friendsCard.append(none);
    } else {
      const list = document.createElement("div");
      list.className = "profile-friend-list";

      for (const friend of userData.friends) {
        const row = document.createElement("div");
        row.className = "profile-friend-row";
        row.onclick = () => navigate(`#/user/${friend}`);

        const fav = document.createElement("img");
        fav.className = "profile-friend-avatar";
        fav.src = "/default-avatar.png";

        fetch(`${API_BASE}/api/user/${friend}`, { credentials: "include" })
          .then(r => r.json())
          .then(b => {
            if (b.success && b.data.avatar) fav.src = b.data.avatar;
          })
          .catch(() => {});

        const fn = document.createElement("span");
        fn.textContent = friend;
        fn.className = "profile-friend-name";

        row.append(fav, fn);
        list.append(row);
      }

      friendsCard.append(list);
    }

  })();

  return () => {
    cancelled = true;
    back.onclick = null;
  };
}
