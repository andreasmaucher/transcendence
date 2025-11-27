/* src/game/countdown.ts */

export function showCountdown(
  wrapper: HTMLElement,
  canvas: HTMLCanvasElement
): Promise<void> {
  return new Promise((resolve) => {
    canvas.style.filter = "blur(6px)";

    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.top = "50%";
    el.style.left = "50%";
    el.style.transform = "translate(-50%, -50%)";
    el.style.fontSize = "96px";
    el.style.color = "white";
    el.style.fontWeight = "bold";
    el.style.textShadow = "0 0 15px black";
    el.style.opacity = "0";
    el.style.transition = "opacity 0.35s ease, transform 0.35s ease";
    el.style.zIndex = "99999";
    el.style.pointerEvents = "none";

    wrapper.append(el);

    const sequence = ["3", "2", "1"];
    let index = 0;

    function animate(text: string, isGo: boolean) {
    el.textContent = text;

    if (isGo) {
        el.style.color = "#b851ca";
    } else {
        el.style.color = "white";
    }

    // Fade in
    el.style.opacity = "0";
    el.style.transform = "translate(-50%, -50%) scale(0.7)";
    void el.offsetWidth;

    el.style.opacity = "1";
    el.style.transform = "translate(-50%, -50%) scale(1)";

    // Fade OUT slowly after 600ms, before next number
    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transform = "translate(-50%, -50%) scale(1.2)";
    }, 600);
    }

    // Start first
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
        }, 900);

        return;
    }

    animate(sequence[index], sequence[index] === "GO!");
    }, 1000);

  });
}
