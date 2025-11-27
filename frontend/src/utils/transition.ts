// 
export function applyPageTransition(container: HTMLElement) {
  container.classList.remove("page-show");

  void container.offsetWidth;

  container.classList.add("page-show");
}
