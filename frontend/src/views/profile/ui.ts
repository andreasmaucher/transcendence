// src/views/profile/ui.ts
import { fetchMe, updateUser } from "../../api/http";
import { navigate } from "../../router/router";
import { updateTopBar } from "../topbar/ui";
import { t } from "../../i18n";

export function renderProfile(container: HTMLElement) {
  container.innerHTML = "";
  let cancelled = false;

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
  title.textContent = t("profile.title");
  header.append(title);

  const back = document.createElement("button");
  back.className = "tournament-back-btn";
  back.textContent = t("profile.backToMenu");
  back.onclick = () => navigate("#/menu");
  header.append(back);

  // STATUS
  const status = document.createElement("div");
  status.className = "tournament-status";
  status.textContent = t("profile.loading");
  box.append(status);

  // CONTENT LIST
  const content = document.createElement("div");
  content.className = "tournament-list";
  box.append(content);

  (async () => {
    const me = await fetchMe();
    if (!me || cancelled) {
      status.textContent = t("profile.notLoggedIn");
      return;
    }

    status.textContent = "";
    let username = me.username;
    let avatarSrc = me.avatar || "/default-avatar.png";
    content.innerHTML = "";

    //
    // AVATAR ROW
    //
    const avatarRow = document.createElement("div");
    avatarRow.className = "tournament-row";
    avatarRow.style.flexDirection = "column";
    avatarRow.style.alignItems = "center";

    const avatar = document.createElement("img");
    avatar.src = avatarSrc;
    avatar.width = 140;
    avatar.height = 140;
    avatar.style.borderRadius = "50%";
    avatar.style.objectFit = "cover";
    avatar.style.border = "2px solid #ff2ea6";
    avatar.style.marginBottom = "1rem";

    // Hidden file input
    const avatarInput = document.createElement("input");
    avatarInput.type = "file";
    avatarInput.accept = "image/*";
    avatarInput.style.display = "none";

    // Pretty upload button
    const uploadBtn = document.createElement("button");
    uploadBtn.className = "tournament-row-btn";
    uploadBtn.textContent = t("profile.changeAvatar");
    uploadBtn.style.marginTop = "0.6rem";

    uploadBtn.onclick = () => avatarInput.click();

    avatarInput.onchange = () => {
      const file = avatarInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        avatarSrc = reader.result as string;
        avatar.src = avatarSrc;
      };
      reader.readAsDataURL(file);
    };

    avatarRow.append(avatar, uploadBtn, avatarInput);
    content.append(avatarRow);

    //
    // USERNAME ROW
    //
    const userRow = document.createElement("div");
    userRow.className = "tournament-row";
    userRow.style.flexDirection = "column";

    const userInput = document.createElement("input");
    userInput.type = "text";
    userInput.value = username;

    userInput.style.padding = "8px";
    userInput.style.borderRadius = "6px";
    userInput.style.border = "1px solid #ff2cfb55";
    userInput.style.background = "rgba(0,0,0,0.35)";
    userInput.style.color = "#ff6bff";

    userRow.append(userInput);
    content.append(userRow);

    //
    // PASSWORD ROW
    //
    const passRow = document.createElement("div");
    passRow.className = "tournament-row";
    passRow.style.flexDirection = "column";

    const newPass = document.createElement("input");
    newPass.type = "password";
    newPass.placeholder = t("profile.newPassword");

    Object.assign(newPass.style, {
      padding: "8px",
      borderRadius: "6px",
      border: "1px solid #ff2cfb55",
      background: "rgba(0,0,0,0.35)",
      color: "#ff6bff",
      marginBottom: "0.6rem",
    });

    const confirmPass = document.createElement("input");
    confirmPass.type = "password";
    confirmPass.placeholder = t("profile.confirmPassword");

    Object.assign(confirmPass.style, {
      padding: "8px",
      borderRadius: "6px",
      border: "1px solid #ff2cfb55",
      background: "rgba(0,0,0,0.35)",
      color: "#ff6bff",
    });

    passRow.append(newPass, confirmPass);
    content.append(passRow);

    //
    // MESSAGE AREA
    //
    const message = document.createElement("div");
    message.style.marginTop = "0.5rem";
    message.style.textAlign = "center";
    box.append(message);

    //
    // SAVE BUTTON
    //
    const save = document.createElement("button");
    save.className = "tournament-create-btn";
    save.textContent = t("profile.saveChanges");

    save.onclick = async () => {
      save.disabled = true;
      message.textContent = "";

      try {
        const newName = userInput.value.trim();

        if (newName && newName !== username) {
          await updateUser({ username, newUsername: newName });
          username = newName;
        }

        if (avatarSrc !== me.avatar) {
          await updateUser({ username, newAvatar: avatarSrc });
        }

        if (newPass.value || confirmPass.value) {
          if (newPass.value !== confirmPass.value) {
            message.textContent = t("profile.passwordsNoMatch");
            save.disabled = false;
            return;
          }

          if (newPass.value.length < 4) {
            message.textContent = t("profile.passwordTooShort");
            save.disabled = false;
            return;
          }

          await updateUser({ username, newPassword: newPass.value });
        }

        await updateTopBar();
        message.textContent = t("profile.saved");

        newPass.value = "";
        confirmPass.value = "";
      } catch (err: any) {
        message.textContent = err?.message || t("profile.updateFailed");
      } finally {
        save.disabled = false;
      }
    };

    box.append(save);
  })();

  return () => {
    cancelled = true;
    back.onclick = null;
  };
}
