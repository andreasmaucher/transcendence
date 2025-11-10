// src/views/menu/ui.ts
import { navigate } from "../../router/router";

export function renderMenu(root: HTMLElement) {
  const el = document.createElement("section");
  el.id = "menu-view";
  el.innerHTML = `
    <h1>Menu</h1>
    <p>Menu placeholder</p>
    <button id="go-login">Log out (to login)</button>
  `;
  el.querySelector<HTMLButtonElement>("#go-login")!
    .addEventListener("click", () => navigate("#/login"));
  root.appendChild(el);
}
