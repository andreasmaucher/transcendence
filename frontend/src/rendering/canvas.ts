import { COLOR_BACKGROUND, COLOR_CENTERLINE, COLOR_PADDLE_BALL_LIGHT, COLOR_SCORE, FONT_SCORE } from "../constants";
import type { State } from "../game/state";

// Draw everything (reads state but does not change it, since there is no game logic here)
// function takes in a 2D canvas context ctx and the gurrent game State s
export function draw(ctx: CanvasRenderingContext2D, s: State): void {
  // wipes all previous pixels in the full canvas area
  ctx.clearRect(0, 0, s.width, s.height);
  ctx.fillStyle = COLOR_BACKGROUND;
  // paints the entire canvas area with the background color
  ctx.fillRect(0, 0, s.width, s.height);

  // this part draws the center line dividing the field in half
  ctx.strokeStyle = COLOR_CENTERLINE;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(s.width / 2, 0);
  ctx.lineTo(s.width / 2, s.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // draws the two paddles as filled rectangles
  ctx.fillStyle = COLOR_PADDLE_BALL_LIGHT;
  ctx.fillRect(s.left.x, s.left.y, s.left.w, s.left.h); // left paddle
  ctx.fillRect(s.right.x, s.right.y, s.right.w, s.right.h); // right paddle

  // draws the ball as a circle
  ctx.beginPath();
  ctx.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2);
  ctx.fill();

  // draws the score text near the top
  ctx.fillStyle = COLOR_SCORE;
  ctx.font = FONT_SCORE;
  ctx.fillText(String(s.scoreL), s.width * 0.4, 32);
  ctx.fillText(String(s.scoreR), s.width * 0.6, 32);

  // show winner message if game is over
  if (s.isOver && s.winner) {
    ctx.fillStyle = "#fbbf24"; // bright yellow for winner text
    ctx.font = "32px system-ui";
    ctx.textAlign = "center";
    const winnerText =
      s.winner === "left" ? "Left Player Wins!" : "Right Player Wins!";
    ctx.fillText(winnerText, s.width / 2, s.height / 2);
    ctx.fillText("Refresh to play again", s.width / 2, s.height / 2 + 40);
    ctx.textAlign = "left"; // reset text alignment
  }
}
