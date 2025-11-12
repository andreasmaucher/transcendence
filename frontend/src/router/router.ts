// src/router/router.ts
import { fetchMe } from "../api/http";

export type View = (container: HTMLElement) => void;
type Routes = Record<string, View>;

let routes: Routes = {};
let containerEl: HTMLElement;
let renderLock = false;
let lastNavigateAt = 0;
const NAV_THROTTLE_MS = 300;

export function registerRoutes(map: Routes) {
  routes = map;
}

export function startRouter(container: HTMLElement) {
  containerEl = container;

  window.addEventListener(
    "hashchange",
    () => {
      void renderCurrent();
    },
    { passive: true }
  );
  if (!location.hash) {
    history.replaceState(null, "", "#/login");
  }

  void renderCurrent();
}

export function navigate(hash: string) {
  const now = Date.now();
  if (now - lastNavigateAt < NAV_THROTTLE_MS) return;
  lastNavigateAt = now;

  if (location.hash === hash) {
    void renderCurrent();
  } else {
    location.hash = hash;
  }
}

// Helpers

async function requireSessionOrRedirect(): Promise<boolean> {
  try {
    const me = await fetchMe();
    if (me) return true;
  } catch {
  }

  // Force login 
  history.replaceState(null, "", "#/login");
  const loginView = routes["#/login"];
  if (loginView) {
    containerEl.replaceChildren();
    loginView(containerEl);
  }
  return false;
}

// render

async function renderCurrent() {
  if (!containerEl) return;
  if (renderLock) return;
  renderLock = true;

  try {
    const hash = location.hash || "#/login";
    const view = routes[hash] ?? routes["#/login"];
    if (!view) return;

    if (hash !== "#/login") {
      const ok = await requireSessionOrRedirect();
      if (!ok) return;
    }

    containerEl.replaceChildren();
    view(containerEl);

  } finally {
    renderLock = false;
  }
}
