// src/views/profile/ui.ts
import { fetchMe, updateUser } from "../../api/http";
import { navigate } from "../../router/router";

export function renderProfile(container: HTMLElement) {
  container.innerHTML = "";
  let cancelled = false;

  const title = document.createElement("h1");
  title.textContent = "Profile";
  container.append(title);

  const backBtn = document.createElement("button");
  backBtn.textContent = "← Back";
  backBtn.onclick = () => navigate("#/menu");
  container.append(backBtn);

  const box = document.createElement("div");
  box.textContent = "Loading…";
  container.append(box);

  (async () => {
    const me = await fetchMe();
    if (!me || cancelled) return;

    let currentUsername = me.username;
    let currentAvatar = me.avatar || "/default-avatar.png";

    // ---------- VIEW MODE ----------
    function renderViewMode() {
      box.innerHTML = "";

      const avatar = document.createElement("img");
      avatar.src = currentAvatar;
      avatar.width = 140;
      avatar.height = 140;
      avatar.style.borderRadius = "50%";
      avatar.style.objectFit = "cover";
      avatar.style.border = "2px solid #ff2ea6";

      const username = document.createElement("h2");
      username.textContent = currentUsername;

      const joined = document.createElement("p");
      joined.textContent = `Joined: ${new Date(me.created_at).toLocaleDateString()}`;

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit Profile";
      editBtn.onclick = () => renderEditMode();

      box.append(avatar, username, joined, editBtn);
    }

    // ---------- EDIT MODE ----------
    function renderEditMode() {
      box.innerHTML = "";

      const avatar = document.createElement("img");
      avatar.src = currentAvatar;
      avatar.width = 140;
      avatar.height = 140;
      avatar.style.borderRadius = "50%";
      avatar.style.objectFit = "cover";
      avatar.style.border = "2px solid #ff2ea6";

      // avatar upload
      const avatarUpload = document.createElement("input");
      avatarUpload.type = "file";
      avatarUpload.accept = "image/*";
      avatarUpload.style.display = "block";
      avatarUpload.style.marginTop = "1rem";

      avatarUpload.onchange = async () => {
        const file = avatarUpload.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          avatar.src = base64;          // preview
          currentAvatar = base64;       // update pending avatar
        };
        reader.readAsDataURL(file);
      };

      // username input
      const usernameInput = document.createElement("input");
      usernameInput.type = "text";
      usernameInput.value = currentUsername;
      usernameInput.style.display = "block";
      usernameInput.style.marginTop = "1rem";

      // password change
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

      // messages
      const msg = document.createElement("div");
      msg.style.marginTop = "0.5rem";

      // Save button
      const save = document.createElement("button");
      save.textContent = "Save";
      save.style.display = "block";
      save.style.marginTop = "1rem";

      save.onclick = async () => {
        msg.textContent = "";
        save.disabled = true;

        try {
          // username update
          const newName = usernameInput.value.trim();
          if (newName && newName !== currentUsername) {
            await updateUser({ username: currentUsername, newUsername: newName });
            currentUsername = newName;
          }

          // avatar update
          if (currentAvatar !== me.avatar) {
            await updateUser({
              username: currentUsername,
              newAvatar: currentAvatar,
            });
          }

          // password update
          if (newPass.value || confirmPass.value) {
            if (newPass.value !== confirmPass.value) {
              msg.textContent = "Passwords do not match.";
              save.disabled = false;
              return;
            }

            if (newPass.value.length < 4) {
              msg.textContent = "Password too short.";
              save.disabled = false;
              return;
            }

            await updateUser({
              username: currentUsername,
              newPassword: newPass.value,
            });
          }

          msg.textContent = "Saved!";
          // Re-render view mode with updated fields
          renderViewMode();

        } catch (err: any) {
          msg.textContent = err?.message || "Failed to update profile.";
        } finally {
          save.disabled = false;
        }
      };

      // Cancel button
      const cancel = document.createElement("button");
      cancel.textContent = "Cancel";
      cancel.onclick = () => renderViewMode();
      cancel.style.display = "block";
      cancel.style.marginTop = "0.5rem";

      box.append(
        avatar,
        avatarUpload,
        usernameInput,
        newPass,
        confirmPass,
        save,
        cancel,
        msg
      );
    }

    // Start in view mode
    renderViewMode();
  })();

  // cleanup
  return () => {
    cancelled = true;
    backBtn.onclick = null;
  };
}
