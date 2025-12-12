export function initStarfield() {
  const canvas = document.getElementById("bg-stars") as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const colors = ["#ff2cfb", "#2ffffa"];

  const PARALLAX = 20; // subtle parallax strength
  let mouseX = 0;
  let mouseY = 0;

  // Normalize mouse position to center [-0.5 .. 0.5]
  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX / window.innerWidth - 0.5;
    mouseY = e.clientY / window.innerHeight - 0.5;
  });

  const w = () => canvas.width;
  const h = () => canvas.height;

  interface Star {
    x: number;
    y: number;
    size: number;
    speed: number;
    color: string;
    twOffset: number;
  }

  const stars: Star[] = [];

  function makeStar(): Star {
    return {
      x: Math.random() * w(),
      y: Math.random() * h(),
      size: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.07 + 0.03,
      color: colors[Math.floor(Math.random() * colors.length)],
      twOffset: Math.random() * Math.PI * 2
    };
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const count = Math.floor((w() * h()) / 15000);

    stars.length = 0;
    for (let i = 0; i < count; i++) {
      stars.push(makeStar());
    }
  }

  resize();
  window.addEventListener("resize", resize);

  function loop(t: number) {
    ctx.clearRect(0, 0, w(), h());

    for (const s of stars) {
      // vertical drift
      s.y += s.speed;
      if (s.y > h()) {
        s.x = Math.random() * w();
        s.y = 0;
      }

      // twinkle
      const tw = 0.4 + Math.abs(Math.sin(t * 0.001 + s.twOffset)) * 0.6;

      // parallax offset based on star depth and mouse movement
      const px = mouseX * s.size * PARALLAX;
      const py = mouseY * s.size * PARALLAX;

      ctx.globalAlpha = tw;
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x + px, s.y + py, s.size, s.size);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
