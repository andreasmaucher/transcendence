export function showMessageOverlay(
  message: string,
  durationMs: number = 3000
): Promise<void> {
  return new Promise((resolve) => {
    console.log("[MessageOverlay] Showing message:", message);

    // Full-screen overlay (fixed to viewport, not relative to wrapper)
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.background = "rgba(0, 0, 0, 0.9)";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999999";
    overlay.style.gap = "24px";

    // Message text
    const messageEl = document.createElement("div");
    messageEl.textContent = message;
    messageEl.style.fontSize = "40px";
    messageEl.style.fontWeight = "700";
    messageEl.style.color = "#ff2cfb";
    messageEl.style.textAlign = "center";
    messageEl.style.textShadow = `
      0 0 16px #ff6bff,
      0 0 28px #ff2cfb66,
      0 0 46px #ff2cfb33
    `;
    messageEl.style.opacity = "0";
    messageEl.style.transition = "opacity 0.3s ease";

    overlay.append(messageEl);
    document.body.append(overlay);

    // Fade in animation
    requestAnimationFrame(() => {
      messageEl.style.opacity = "1";
    });

    // Auto-dismiss after duration
    setTimeout(() => {
      console.log("[MessageOverlay] Starting fade out");
      messageEl.style.opacity = "0";
      setTimeout(() => {
        overlay.remove();
        console.log("[MessageOverlay] Resolved after", durationMs, "ms");
        resolve();
      }, 300); // Wait for fade out animation
    }, durationMs);
  });
}

