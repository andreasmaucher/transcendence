import { COLOR_BACKGROUND, COLOR_CENTERLINE, COLOR_PADDLE_BALL_LIGHT, COLOR_SCORE, FONT_SCORE } from "../constants";

type Paddle = { x: number; y: number; w: number; h: number; speed: number };
type Ball = { x: number; y: number; vx: number; vy: number; r: number };
type State = {
  width: number;
  height: number;
  left: Paddle;
  right: Paddle;
  ball: Ball;
  scoreL: number;
  scoreR: number;
  gameOver: boolean;
  winner: "left" | "right" | null;
  winningScore: number;
  tick: number;
};

export function draw(ctx: CanvasRenderingContext2D, s: State): void {
  ctx.clearRect(0, 0, s.width, s.height);
  ctx.fillStyle = COLOR_BACKGROUND;
  ctx.fillRect(0, 0, s.width, s.height);

  ctx.strokeStyle = COLOR_CENTERLINE;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(s.width / 2, 0);
  ctx.lineTo(s.width / 2, s.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = COLOR_PADDLE_BALL_LIGHT;
  ctx.fillRect(s.left.x, s.left.y, s.left.w, s.left.h);
  ctx.fillRect(s.right.x, s.right.y, s.right.w, s.right.h);

  ctx.beginPath();
  ctx.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLOR_SCORE;
  ctx.font = FONT_SCORE;
  ctx.fillText(String(s.scoreL), s.width * 0.4, 32);
  ctx.fillText(String(s.scoreR), s.width * 0.6, 32);

  if (s.gameOver && s.winner) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "32px system-ui";
    ctx.textAlign = "center";
    const winnerText = s.winner === "left" ? "Left Player Wins!" : "Right Player Wins!";
    ctx.fillText(winnerText, s.width / 2, s.height / 2);
    ctx.fillText("Refresh to play again", s.width / 2, s.height / 2 + 40);
    ctx.textAlign = "left";
  }
}

