// src/router/router.ts
import { fetchMe } from "../api/http";


export type View = (container: HTMLElement) => void | (() => void) | Promise<void | (() => void)>;
export type Routes = Record<string, View>;

let routes: Routes = {};
let root: HTMLElement;
let cleanup: (() => void) | null = null;

let isRendering = false;
let lastNav = 0;
const NAV_DELAY = 200;

// public api

export function registerRoutes(map: Routes) {
  routes = map;
}

export function startRouter(container: HTMLElement) {
  root = container;
  window.addEventListener("hashchange", () => void render(), { passive: true });

  if (!location.hash) {
    location.hash = "#/login";
  }

  void render();
}

export function navigate(hash: string) {
  const now = Date.now();
  if (now - lastNav < NAV_DELAY) return;
  lastNav = now;

  if (location.hash === hash) {
    void render();
  } else {
    location.hash = hash;
  }
}

// helpers

async function isAuthenticated() {
  try {
    return Boolean(await fetchMe());
  } catch {
    return false;
  }
}

// main render

async function render() {
  if (isRendering) return;
  isRendering = true;

  try {
    // FIX: remove ?query from hash
    const fullHash = location.hash || "#/login";
    const hash = fullHash.split("?")[0];

    let view = routes[hash];

  if (!view) {
    const authenticated = await isAuthenticated();
    navigate(authenticated ? "#/menu" : "#/login");
    return;
  }

  // NEW: redirect away from login if logged in
  if (hash === "#/login") {
    const authenticated = await isAuthenticated();
    if (authenticated) {
      navigate("#/menu");
      return;
    }
  }

  // existing rule: protect all other routes
  if (hash !== "#/login") {
    const ok = await isAuthenticated();
    if (!ok) {
      navigate("#/login");
      return;
    }
  }


    if (cleanup) {
      cleanup();
      cleanup = null;
    }

    root.replaceChildren();
    const maybeCleanup = await view(root);
    if (typeof maybeCleanup === "function") cleanup = maybeCleanup;

  } finally {
    isRendering = false;
  }
}
