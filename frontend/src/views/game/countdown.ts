export function showCountdown(
  wrapper: HTMLElement,
  canvas: HTMLCanvasElement
): { promise: Promise<void>; cancel: () => void } {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let animationTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let el: HTMLDivElement | null = null;

  let resolvePromise: (() => void) | null = null;

  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
    canvas.style.filter = "blur(6px)";

    el = document.createElement("div");

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
      if (!el) return;
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

      animationTimeoutId = setTimeout(() => {
        if (!el) return;
        el.style.opacity = "0";
        el.style.transform = "translate(-50%, -50%) scale(1.25)";
      }, 650);
    }

    animate(sequence[index], false);

    intervalId = setInterval(() => {
      index++;

      if (index >= sequence.length) {
        if (intervalId) clearInterval(intervalId);
        animate("GO!", true);

        timeoutId = setTimeout(() => {
          if (el) el.remove();
          canvas.style.filter = "none";
          resolve();
        }, 950);

        return;
      }

      animate(sequence[index], false);
    }, 1000);
  });

  //  added this so the countdown can be cancelled if the user forfeits the match
  // Cancel immediately cleans up all timers/elements and resolves the promise
  // so the calling code can continue and check the 'cancelled' flag
  const cancel = () => {
    if (intervalId) clearInterval(intervalId);
    if (timeoutId) clearTimeout(timeoutId);
    if (animationTimeoutId) clearTimeout(animationTimeoutId);
    if (el) el.remove();
    canvas.style.filter = "none";
    if (resolvePromise) resolvePromise(); // Resolve promise (code that takes time to compelte / asynchronous operation) so the countdown is not blocking
  };

  return { promise, cancel };
}
