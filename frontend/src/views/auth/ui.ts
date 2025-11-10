// src/views/auth/ui.ts
import { navigate } from "../../router/router";

export function renderAuth(root: HTMLElement) {
  const el = document.createElement("section");
  el.id = "auth-view";
  el.innerHTML = `
    <h1>TRANSCENDENCE</h1>
    <p>Auth screen placeholder</p>
    <button id="go-menu">Go to Menu</button>
  `;
  el.querySelector<HTMLButtonElement>("#go-menu")!
    .addEventListener("click", () => navigate("#/menu"));
  root.appendChild(el);
}
