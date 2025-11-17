// src/views/auth/ui.ts
import { loginUser, registerUser, fetchMe } from "../../api/http";
import { navigate } from "../../router/router";
import { updateTopBar } from "../topbar/ui";
import { t } from "../../i18n";

type Mode = "login" | "register";

export function renderAuth(container: HTMLElement) {
  container.innerHTML = "";

  let mode: Mode = "login";

  // Root
  const root = document.createElement("div");
  root.className = "auth-screen";

  const card = document.createElement("div");
  card.className = "auth-card";
  root.appendChild(card);

  // Title
  const title = document.createElement("h2");
  title.textContent = t("auth.welcome");
  title.className = "auth-title";
  card.appendChild(title);

  // Tabs
  const tabs = document.createElement("div");
  tabs.className = "auth-tabs";
  tabs.innerHTML = `
    <button id="auth-login" class="auth-tab">${t("auth.login")}</button>
    <button id="auth-register" class="auth-tab">${t("auth.register")}</button>
  `;
  card.appendChild(tabs);

  const loginTab = tabs.querySelector("#auth-login") as HTMLButtonElement;
  const registerTab = tabs.querySelector("#auth-register") as HTMLButtonElement;

  // Message
  const message = document.createElement("div");
  message.className = "auth-message";
  card.appendChild(message);

  // Form
  const form = document.createElement("form");
  form.className = "auth-form";
  form.innerHTML = `
    <label class="auth-label">
      ${t("auth.username")}
      <input id="auth-user" class="auth-input" type="text" autocomplete="username"/>
      <div id="auth-user-err" class="auth-field-error"></div>
    </label>

    <label class="auth-label">
      ${t("auth.password")}
      <input id="auth-pass" class="auth-input" type="password" autocomplete="current-password"/>
      <div id="auth-pass-err" class="auth-field-error"></div>
    </label>

    <button id="auth-submit" class="auth-submit" type="submit">${t("auth.login")}</button>
  `;
  card.appendChild(form);

  const inputUser = form.querySelector("#auth-user") as HTMLInputElement;
  const inputPass = form.querySelector("#auth-pass") as HTMLInputElement;

  const errUser = form.querySelector("#auth-user-err") as HTMLDivElement;
  const errPass = form.querySelector("#auth-pass-err") as HTMLDivElement;
  const submit = form.querySelector("#auth-submit") as HTMLButtonElement;

  container.appendChild(root);

  // ---- Helpers ----

  function switchMode(m: Mode) {
    mode = m;
    message.textContent = "";
    errUser.textContent = "";
    errPass.textContent = "";
    submit.textContent = m === "login" ? t("auth.login") : t("auth.register");

    loginTab.classList.toggle("active", m === "login");
    registerTab.classList.toggle("active", m === "register");
  }

  function showError(msg: string) {
    message.textContent = msg;
  }

  function validate() {
    const errors: { user?: string; pass?: string } = {};

    if (!inputUser.value.trim()) errors.user = t("auth.errUsernameRequired");
    if (inputPass.value.length < 4) errors.pass = t("auth.errPasswordShort");

    errUser.textContent = errors.user || "";
    errPass.textContent = errors.pass || "";

    return Object.keys(errors).length === 0;
  }

  // ---- Events ----

  loginTab.onclick = () => switchMode("login");
  registerTab.onclick = () => switchMode("register");

  form.onsubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      showError(t("auth.errFixForm"));
      return;
    }

    submit.disabled = true;
    showError("");

    try {
      if (mode === "login") {
        await loginUser({ username: inputUser.value, password: inputPass.value });
      } else {
        await registerUser({ username: inputUser.value, password: inputPass.value });
      }

      const me = await fetchMe();
      if (me) {
        await updateTopBar();
        navigate("#/menu");
        return;
      }

      showError(t("auth.errAuthFailed"));
    } catch (err: any) {
      showError(err?.message || t("auth.errGeneric"));
    } finally {
      submit.disabled = false;
    }
  };

  // Start with login tab active
  switchMode("login");
}
