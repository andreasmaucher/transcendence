// src/router/router.ts
export type View = (container: HTMLElement) => void;

type Routes = Record<string, View>;

let routes: Routes = {};
let containerEl: HTMLElement;

export function registerRoutes(map: Routes) {
  routes = map;
}

export function startRouter(container: HTMLElement) {
  containerEl = container;
  window.addEventListener("hashchange", renderCurrent, { passive: true });
  if (!location.hash) location.hash = "#/login";
  renderCurrent();
}

export function navigate(hash: string) {
  if (location.hash === hash) {
    renderCurrent();
  } else {
    location.hash = hash;
  }
}

function renderCurrent() {
  const view = routes[location.hash] ?? routes["#/login"];
  if (!view) return;
  containerEl.replaceChildren(); // clear
  view(containerEl);
}
