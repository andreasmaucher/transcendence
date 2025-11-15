// src/router/router.ts
import { fetchMe } from "../api/http";

export type View = (container: HTMLElement) => void | (() => void);
type Routes = Record<string, View>;

let routes: Routes = {};
let containerEl: HTMLElement;
let activeCleanup: (() => void) | null = null;

let renderLock = false;
let lastNavigateAt = 0;
const NAV_THROTTLE_MS = 200;

//public api

export function registerRoutes(map: Routes) {
  routes = map;
}

export function startRouter(container: HTMLElement) {
  containerEl = container;

  window.addEventListener(
    "hashchange",
    () => void renderCurrent(),
    { passive: true }
  );

  if (!location.hash) {
    location.hash = "#/login";
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

// helpers

async function requireSessionOrRedirect(): Promise<boolean> {
  try {
    const me = await fetchMe();
    if (me) return true;
  } catch {
    // ignored
  }

  location.hash = "#/login";
  return false;
}

// render

async function renderCurrent() {
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

    if (activeCleanup) {
      activeCleanup();
      activeCleanup = null;
    }

    containerEl.replaceChildren();
    const cleanup = view(containerEl);

    if (typeof cleanup === "function") {
      activeCleanup = cleanup;
    }

  } finally {
    renderLock = false;
  }
}
