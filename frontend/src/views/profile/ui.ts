// src/views/profile/ui.ts
import { fetchMe, updateUser } from "../../api/http";
import { navigate } from "../../router/router";
import { updateTopBar } from "../topbar/ui";

export function renderProfile(container: HTMLElement) {
  container.innerHTML = "";
  let cancelled = false;

  // Title
  const title = document.createElement("h1");
  title.textContent = "Edit Profile";
  container.append(title);

  // Back button
  const back = document.createElement("button");
  back.textContent = "← Back to Menu";
  back.onclick = () => navigate("#/menu");
  container.append(back);

  // Main content box
  const box = document.createElement("div");
  box.textContent = "Loading…";
  container.append(box);

  (async () => {
    const me = await fetchMe();
    if (!me || cancelled) {
      box.textContent = "Not logged in.";
      return;
    }

    let username = me.username;
    let avatarSrc = me.avatar || "/default-avatar.png";

    // Clear content
    box.innerHTML = "";

    // --- Avatar preview ---
    const avatar = document.createElement("img");
    avatar.src = avatarSrc;
    avatar.width = 140;
    avatar.height = 140;
    avatar.style.borderRadius = "50%";
    avatar.style.objectFit = "cover";
    avatar.style.border = "2px solid #ff2ea6";
    avatar.style.display = "block";
    box.append(avatar);

    // Avatar upload
    const avatarInput = document.createElement("input");
    avatarInput.type = "file";
    avatarInput.accept = "image/*";
    avatarInput.style.display = "block";
    avatarInput.style.marginTop = "1rem";
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
    box.append(avatarInput);

    // Username input
    const userInput = document.createElement("input");
    userInput.type = "text";
    userInput.value = username;
    userInput.style.display = "block";
    userInput.style.marginTop = "1rem";
    box.append(userInput);

    // Password inputs
    const newPass = document.createElement("input");
    newPass.type = "password";
    newPass.placeholder = "New password";
    newPass.style.display = "block";
    newPass.style.marginTop = "1rem";

    const confirmPass = document.createElement("input");
    confirmPass.type = "password";
    confirmPass.placeholder = "Confirm password";
    confirmPass.style.display = "block";
    confirmPass.style.marginTop = "1rem";

    box.append(newPass, confirmPass);

    const message = document.createElement("div");
    message.style.marginTop = "0.5rem";
    box.append(message);

    // Save button
    const save = document.createElement("button");
    save.textContent = "Save Changes";
    save.style.display = "block";
    save.style.marginTop = "1rem";

    save.onclick = async () => {
      save.disabled = true;
      message.textContent = "";

      try {
        // Username update
        const newName = userInput.value.trim();
        if (newName && newName !== username) {
          await updateUser({ username, newUsername: newName });
          username = newName;
        }

        // Avatar update 
        if (avatarSrc !== me.avatar) {
          await updateUser({ username, newAvatar: avatarSrc });
        }

        // Password update
        if (newPass.value || confirmPass.value) {
          if (newPass.value !== confirmPass.value) {
            message.textContent = "Passwords do not match.";
            save.disabled = false;
            return;
          }

          if (newPass.value.length < 4) {
            message.textContent = "Password too short.";
            save.disabled = false;
            return;
          }

          await updateUser({ username, newPassword: newPass.value });
        }

        await updateTopBar();
        message.textContent = "Saved!";
        newPass.value = "";
        confirmPass.value = "";

      } catch (err: any) {
        message.textContent = err?.message || "Update failed.";
      } finally {
        save.disabled = false;
      }
    };

    box.append(save);
  })();

  // Cleanup
  return () => {
    cancelled = true;
    back.onclick = null;
  };
}