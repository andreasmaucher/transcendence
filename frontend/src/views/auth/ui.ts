// src/views/auth/ui.ts
//


import { loginUser, registerUser, fetchMe } from "../../api/http";
import { navigate } from "../../router/router";

type Mode = "login" | "register";

interface AuthState {
  mode: Mode;
  loading: boolean;
  message: string | null;
  fieldErrors: {
    username: string | null;
    password: string | null;
  };
}

const initialState: AuthState = {
  mode: "login",
  loading: false,
  message: null,
  fieldErrors: {
    username: null,
    password: null,
  },
};

export function renderAuth(container: HTMLElement) {
  container.replaceChildren();

  const state: AuthState = { ...initialState };

  /// DOM
  const root = document.createElement("div");
  root.className = "auth-screen";

  const card = document.createElement("div");
  card.className = "auth-card";
  root.appendChild(card);

  // Title
  const title = document.createElement("h2");
  title.className = "auth-title";
  title.textContent = "Welcome";
  card.appendChild(title);

  // Mode tabs
  const tabs = document.createElement("div");
  tabs.className = "auth-tabs";
  tabs.innerHTML = `
    <button id="auth-tab-login" class="auth-tab">Login</button>
    <button id="auth-tab-register" class="auth-tab">Register</button>
  `;
  card.appendChild(tabs);

  const loginTab = tabs.querySelector("#auth-tab-login") as HTMLButtonElement;
  const registerTab = tabs.querySelector("#auth-tab-register") as HTMLButtonElement;

  const messageBox = document.createElement("div");
  messageBox.className = "auth-message";
  card.appendChild(messageBox);

  // Form
  const form = document.createElement("form");
  form.className = "auth-form";
  form.innerHTML = `
    <label class="auth-label">
      Username
      <input id="auth-input-username" class="auth-input" type="text" autocomplete="username"/>
      <div id="auth-error-username" class="auth-field-error"></div>
    </label>

    <label class="auth-label">
      Password
      <input id="auth-input-password" class="auth-input" type="password" autocomplete="current-password"/>
      <div id="auth-error-password" class="auth-field-error"></div>
    </label>

    <button id="auth-submit" class="auth-submit" type="submit">Login</button>
  `;
  card.appendChild(form);

  const inputUsername = form.querySelector("#auth-input-username") as HTMLInputElement;
  const inputPassword = form.querySelector("#auth-input-password") as HTMLInputElement;
  const errorUsername = form.querySelector("#auth-error-username") as HTMLDivElement;
  const errorPassword = form.querySelector("#auth-error-password") as HTMLDivElement;
  const submitBtn = form.querySelector("#auth-submit") as HTMLButtonElement;

  container.appendChild(root);

  /// helepers

  function setMode(mode: Mode) {
    state.mode = mode;
    state.message = null;
    state.fieldErrors = { username: null, password: null };

    loginTab.classList.toggle("active", mode === "login");
    registerTab.classList.toggle("active", mode === "register");

    submitBtn.textContent = mode === "login" ? "Login" : "Register";
    messageBox.textContent = "";

    errorUsername.textContent = "";
    errorPassword.textContent = "";
  }

  function setLoading(loading: boolean) {
    state.loading = loading;
    submitBtn.disabled = loading;
    submitBtn.classList.toggle("loading", loading);
  }

  function setMessage(msg: string | null) {
    state.message = msg;
    messageBox.textContent = msg ?? "";
    messageBox.classList.toggle("visible", !!msg);
  }

  function setFieldErrors(errs: { username?: string | null; password?: string | null }) {
    state.fieldErrors.username = errs.username ?? null;
    state.fieldErrors.password = errs.password ?? null;

    errorUsername.textContent = state.fieldErrors.username ?? "";
    errorPassword.textContent = state.fieldErrors.password ?? "";
  }

  /// validae

  function validate(username: string, password: string) {
    const errors: { username?: string; password?: string } = {};

    if (!username || username.trim().length < 3) {
      errors.username = "Username must be at least 3 chars.";
    }

    if (!password || password.length < 4) {
      errors.password = "Password must be at least 4 chars.";
    }

    return errors;
  }

  // handle evnts
  loginTab.addEventListener("click", () => setMode("login"));
  registerTab.addEventListener("click", () => setMode("register"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (state.loading) return;

    const username = inputUsername.value.trim();
    const password = inputPassword.value;

    // Validate
    const errs = validate(username, password);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setMessage("Please fix the errors.");
      return;
    }

    setFieldErrors({});
    setMessage(null);
    setLoading(true);

    try {
      if (state.mode === "login") {
        await loginUser({ username, password });
      } else {
        await registerUser({ username, password });
      }

      const me = await fetchMe();
      if (!me) {
        setMessage("Authentication failed.");
        return;
      }

      navigate("#/menu");

    } catch (err: any) {
      setMessage(err?.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  });

  // Initial mode
  setMode("login");
}
