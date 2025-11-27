export function showCountdown(
  wrapper: HTMLElement,
  canvas: HTMLCanvasElement
): Promise<void> {
  return new Promise((resolve) => {
    canvas.style.filter = "blur(6px)";

    const el = document.createElement("div");

    // Center + size
    el.style.position = "absolute";
    el.style.top = "50%";
    el.style.left = "50%";
    el.style.transform = "translate(-50%, -50%)";
    el.style.fontSize = "140px";
    el.style.fontWeight = "700";
    el.style.letterSpacing = "3px";
    el.style.zIndex = "99999";
    el.style.pointerEvents = "none";

    el.style.color = "#ff2cfb";

    el.style.textShadow = `
      0 0 12px #ff6bff,
      0 0 22px #ff2cfb66,
      0 0 38px #ff2cfb33
    `;

    el.style.opacity = "0";
    el.style.transition = "opacity 0.45s ease, transform 0.45s ease";

    wrapper.append(el);

    const sequence = ["3", "2", "1"];
    let index = 0;

    function animate(text: string, isGo: boolean) {
      el.textContent = text;

      if (isGo) {
        el.style.color = "#ff4fff";
        el.style.textShadow = `
          0 0 16px #ff6bff,
          0 0 28px #ff2cfb66,
          0 0 46px #ff2cfb33
        `;
      } else {
        el.style.color = "#ff2cfb";
        el.style.textShadow = `
          0 0 12px #ff6bff,
          0 0 22px #ff2cfb66,
          0 0 38px #ff2cfb33
        `;
      }

      // Reset + animate
      el.style.opacity = "0";
      el.style.transform = "translate(-50%, -50%) scale(0.7)";
      void el.offsetWidth;

      el.style.opacity = "1";
      el.style.transform = "translate(-50%, -50%) scale(1)";

      setTimeout(() => {
        el.style.opacity = "0";
        el.style.transform = "translate(-50%, -50%) scale(1.25)";
      }, 650);
    }

    animate(sequence[index], false);

    const timer = setInterval(() => {
      index++;

      if (index >= sequence.length) {
        clearInterval(timer);
        animate("GO!", true);

        setTimeout(() => {
          el.remove();
          canvas.style.filter = "none";
          resolve();
        }, 950);

        return;
      }

      animate(sequence[index], false);
    }, 1000);
  });
}
