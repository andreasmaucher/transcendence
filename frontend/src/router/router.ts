// src/router/router.ts
import { fetchMe } from "../api/http";

export type View = (root: HTMLElement) => void | (() => void);
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
    const hash = location.hash || "#/login";
    let view = routes[hash];

    // If route does not exist → go to menu or login
    if (!view) {
      const authenticated = await isAuthenticated();
      navigate(authenticated ? "#/menu" : "#/login");
      return;
    }

    // Guard protected routes (all except login)
    if (hash !== "#/login") {
      const ok = await isAuthenticated();
      if (!ok) {
        navigate("#/login");
        return;
      }
    }

    // Cleanup previous view
    if (cleanup) {
      cleanup();
      cleanup = null;
    }

    // Render new view
    root.replaceChildren();
    const maybeCleanup = view(root);

    if (typeof maybeCleanup === "function") {
      cleanup = maybeCleanup;
    }

  } finally {
    isRendering = false;
  }
}
