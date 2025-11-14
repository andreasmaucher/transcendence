// src/views/auth/ui.ts
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
  fieldErrors: { username: null, password: null },
};

export function renderAuth(container: HTMLElement) {
  const state: AuthState = { ...initialState };

  const root = document.createElement("div");
  root.className = "auth-screen";

  const card = document.createElement("div");
  card.className = "auth-card";
  root.appendChild(card);

  const title = document.createElement("h2");
  title.textContent = "Welcome";
  card.appendChild(title);

  const tabs = document.createElement("div");
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

  const form = document.createElement("form");
  form.innerHTML = `
    <label>Username
      <input id="auth-input-username" type="text" autocomplete="username"/>
      <div id="auth-error-username" class="auth-field-error"></div>
    </label>
    <label>Password
      <input id="auth-input-password" type="password" autocomplete="current-password"/>
      <div id="auth-error-password" class="auth-field-error"></div>
    </label>
    <button id="auth-submit" type="submit">Login</button>
  `;
  card.appendChild(form);

  const inputUsername = form.querySelector("#auth-input-username") as HTMLInputElement;
  const inputPassword = form.querySelector("#auth-input-password") as HTMLInputElement;
  const errorUsername = form.querySelector("#auth-error-username")!;
  const errorPassword = form.querySelector("#auth-error-password")!;
  const submitBtn = form.querySelector("#auth-submit") as HTMLButtonElement;

  container.appendChild(root);

  // helpers
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

  function setLoading(v: boolean) {
    state.loading = v;
    submitBtn.disabled = v;
  }

  function setMessage(msg: string | null) {
    state.message = msg;
    messageBox.textContent = msg ?? "";
  }

  function setFieldErrors(errs: { username?: string; password?: string }) {
    errorUsername.textContent = errs.username ?? "";
    errorPassword.textContent = errs.password ?? "";
  }

  function validate(u: string, p: string) {
    const e: any = {};
    if (!u || u.length < 3) e.username = "Username must be at least 3 chars.";
    if (!p || p.length < 4) e.password = "Password must be at least 4 chars.";
    return e;
  }

//// 

  function onLoginTab() {
    setMode("login");
  }

  function onRegisterTab() {
    setMode("register");
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    if (state.loading) return;

    const username = inputUsername.value.trim();
    const password = inputPassword.value;

    const errs = validate(username, password);
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setMessage("Please fix the errors.");
      return;
    }

    setFieldErrors({});
    setMessage(null);
    setLoading(true);

    try {
      if (state.mode === "register") {
        await registerUser({ username, password });
        await loginUser({ username, password }); // key fix
      } else {
        await loginUser({ username, password });
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
  }

  loginTab.addEventListener("click", onLoginTab);
  registerTab.addEventListener("click", onRegisterTab);
  form.addEventListener("submit", onSubmit);

  // Initial mode
  setMode("login");

  // clean
  return () => {
    loginTab.removeEventListener("click", onLoginTab);
    registerTab.removeEventListener("click", onRegisterTab);
    form.removeEventListener("submit", onSubmit);
  };
}
