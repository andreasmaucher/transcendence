// Minimal authentication UI used before starting the game.
// Shows Login and Register forms. Resolves when the user is authenticated.

import { fetchMe, registerUser, loginUser } from "../api/http";
import { logout } from "../api/http";

export async function ensureAuthenticated(): Promise<void> {
	const app = document.getElementById("app");
	if (!app) throw new Error("#app not found");

	// If already logged in, nothing to do
	const me = await fetchMe();
	if (me) return;

	// Container
	const container = document.createElement("div");
	container.style.display = "flex";
	container.style.flexDirection = "column";
	container.style.gap = "12px";
	container.style.fontFamily = "system-ui";
	container.style.maxWidth = "320px";
	container.style.margin = "40px auto";

	const title = document.createElement("h2");
	title.textContent = "Sign in to play";
	title.style.textAlign = "center";
	container.appendChild(title);

	// Tabs
	const tabs = document.createElement("div");
	tabs.style.display = "flex";
	tabs.style.gap = "8px";
	const loginTab = document.createElement("button");
	loginTab.textContent = "Login";
	const registerTab = document.createElement("button");
	registerTab.textContent = "Register";
	[loginTab, registerTab].forEach((b) => {
		b.style.padding = "6px 10px";
		b.style.cursor = "pointer";
	});
	tabs.appendChild(loginTab);
	tabs.appendChild(registerTab);
	container.appendChild(tabs);

	// Login form
	const loginForm = document.createElement("form");
	loginForm.innerHTML = `
    <label style="display:block;margin-top:8px;">Username<input name="username" required style="width:100%"/></label>
    <label style="display:block;margin-top:8px;">Password<input type="password" name="password" required style="width:100%"/></label>
    <button type="submit" style="margin-top:12px;padding:6px 10px;cursor:pointer;">Login</button>
    <div class="error" style="color:#ef4444;margin-top:8px;display:none;"></div>
  `;

	// Register form (no avatar URL field)
	const registerForm = document.createElement("form");
	registerForm.style.display = "none";
	registerForm.innerHTML = `
    <label style="display:block;margin-top:8px;">Username<input name="username" required style="width:100%"/></label>
    <label style="display:block;margin-top:8px;">Password<input type="password" name="password" required style="width:100%"/></label>
    <button type="submit" style="margin-top:12px;padding:6px 10px;cursor:pointer;">Register</button>
    <div class="error" style="color:#ef4444;margin-top:8px;display:none;"></div>
  `;

	container.appendChild(loginForm);
	container.appendChild(registerForm);
	app.innerHTML = "";
	app.appendChild(container);

	function showLogin(): void {
		loginForm.style.display = "block";
		registerForm.style.display = "none";
	}
	function showRegister(): void {
		loginForm.style.display = "none";
		registerForm.style.display = "block";
	}
	showLogin();
	loginTab.onclick = showLogin;
	registerTab.onclick = showRegister;

	// Login submit
	const loginError = loginForm.querySelector(".error") as HTMLDivElement;
	loginForm.onsubmit = async (e) => {
		e.preventDefault();
		loginError.style.display = "none";
		const form = new FormData(loginForm);
		const username = String(form.get("username") || "").trim();
		const password = String(form.get("password") || "");
		try {
			await loginUser({ username, password });
			const authed = await fetchMe();
			if (authed) {
				app.innerHTML = "";
				return;
			}
			loginError.textContent = "Login failed";
			loginError.style.display = "block";
		} catch (err: any) {
			loginError.textContent = err?.message || "Login failed";
			loginError.style.display = "block";
		}
	};

	// Register submit
	const registerError = registerForm.querySelector(".error") as HTMLDivElement;
	registerForm.onsubmit = async (e) => {
		e.preventDefault();
		registerError.style.display = "none";
		const form = new FormData(registerForm);
		const username = String(form.get("username") || "").trim();
		const password = String(form.get("password") || "");
		if (!username || !password) {
			registerError.textContent = "Username and password are required";
			registerError.style.display = "block";
			return;
		}
		try {
			await registerUser({ username, password });
			const authed = await fetchMe();
			if (authed) {
				app.innerHTML = "";
				return;
			}
			registerError.textContent = "Registration failed";
			registerError.style.display = "block";
		} catch (err: any) {
			registerError.textContent = err?.message || "Registration failed";
			registerError.style.display = "block";
		}
	};

	// Wait until the container is removed (indicates successful auth)
	await new Promise<void>((resolve) => {
		const observer = new MutationObserver(() => {
			if (!app.contains(container)) {
				observer.disconnect();
				resolve();
			}
		});
		observer.observe(app, { childList: true });
	});
}

// Render a small header with username and Logout button (top-right corner)
export async function renderAuthHeader(): Promise<void> {
	const me = await fetchMe();
	// Remove existing header if present
	const existing = document.getElementById("auth-header");
	if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
	if (!me) return; // nothing to render if not authenticated

	const bar = document.createElement("div");
	bar.id = "auth-header";
	bar.style.position = "fixed";
	bar.style.top = "10px";
	bar.style.right = "10px";
	bar.style.display = "flex";
	bar.style.alignItems = "center";
	bar.style.gap = "8px";
	bar.style.background = "rgba(0,0,0,0.6)";
	bar.style.color = "#fff";
	bar.style.padding = "6px 10px";
	bar.style.borderRadius = "6px";
	bar.style.fontFamily = "system-ui";

	const name = document.createElement("span");
	name.textContent = me.username;
	const btn = document.createElement("button");
	btn.textContent = "Logout";
	btn.style.cursor = "pointer";
	btn.style.background = "#ef4444";
	btn.style.color = "#fff";
	btn.style.border = "none";
	btn.style.padding = "4px 8px";
	btn.style.borderRadius = "4px";
	btn.onclick = async () => {
		try {
			await logout({ username: me.username });
			// Reload to return to auth screen
			location.reload();
		} catch {
			// ignore
		}
	};

	bar.appendChild(name);
	bar.appendChild(btn);
	document.body.appendChild(bar);
}
