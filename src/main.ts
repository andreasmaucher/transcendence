// Simple Pong in TypeScript

// This file:
// 1) defines small data types for paddles, ball, and overall game state
// 2) updates the game each frame (move paddles/ball, bounce, score)
// 3) draws the scene on a canvas (HTML element that provides a blank pixel surface to draw on)
// 4) uses requestAnimationFrame to run ~60 times per second

// Coordinate system for this game:
// - Canvas origin (0,0) is top-left corner
// - x increases to the right; y increases going down
// - All sizes/positions are in pixels

// importing adjustable game constants
import { WIDTH, HEIGHT, PADDLE_W, PADDLE_H, PADDLE_SPEED, BALL_R, BALL_SPEED } from './constants';
import { PADDLE_MARGIN, INITIAL_BALL_VY_RATIO } from './constants';
import { SCORE_OUT_MARGIN } from './constants';
import { COLOR_BACKGROUND, COLOR_CENTERLINE, COLOR_PADDLE_BALL_LIGHT, COLOR_SCORE } from './constants';
import { FONT_SCORE } from './constants';

// Backend config fetch to get server-controlled rules e.g. winningScore
// Falls back to 11 if the server is unavailable
const API_BASE = 'http://localhost:4000';
let WINNING_SCORE = 11; // default used until backend config is loaded

async function fetchConfig(): Promise<{ winningScore: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/config`, { credentials: 'omit' });
    if (!res.ok) throw new Error('config fetch failed');
    const data = await res.json();
    const score = typeof data?.winningScore === 'number' ? data.winningScore : 11;
    return { winningScore: score };
  } catch {
    return { winningScore: 11 };
  }
}

// Type that defines the shape of a paddle object
// Example: a paddle at (x=24,y=100) with size 12x80 and speed 420 px/s
// const p: Paddle = { x: 24, y: 100, w: 12, h: 80, speed: 420 };
type Paddle = { x: number; y: number; w: number; h: number; speed: number };

// Type for the ball
// Ball: position (x,y), velocity (vx,vy), radius r (half the ball's width)
// Example: a ball moving right 360 px/s and down 90 px/s
// const b: Ball = { x: 400, y: 225, vx: 360, vy: 90, r: 8 };
type Ball = { x: number; y: number; vx: number; vy: number; r: number };

// Inputs are simple directions for each paddle: -1 up, 0 still, 1 down
// Example: { left: -1, right: 1 } means left paddle goes up, right goes down
// These values are multiplied by paddle speed each frame.
// On a canvas the y-axis grows downward!!! Moving "up" means decreasing y.
// Canvas uses screen coordinates, meaning origin starts at the top left. Pixels are drawn row by row from top to bottom, so y increases downward.
// (0,0) top-left; (100,0) right; (0,100) down
// example calc.: Paddle at y = 200, Press up → dir = -1, New y = 200 + (-1) * speed * dt = 200 − (speeddt) → moves up
type Inputs = {
  left: -1 | 0 | 1;
  right: -1 | 0 | 1;
};

// A frame is one cycle of the game loop where the game state is updated and then drawn.
// So one frame equals one screen refresh (usually about 60 times / second but depends on display)
// Everything the game needs for one frame lives in State. Keeping it in one
// object makes it easy to pass around to update() and draw().
// scoreL/scoreR tracks the points for left/right players.
type State = {
  width: number;
  height: number;
  left: Paddle;
  right: Paddle;
  ball: Ball;
  scoreL: number;
  scoreR: number;
  gameOver: boolean;
  winner: 'left' | 'right' | null;
};

// Make the initial game state
// Ball starts centered, moving slightly diagonally; paddles start centered.
function createInitialState(): State {
  const centerY = (HEIGHT - PADDLE_H) / 2; // compute y-pos to center a paddle vertically 
  const left: Paddle = {
    x: PADDLE_MARGIN,
    y: centerY,
    w: PADDLE_W,
    h: PADDLE_H,
    speed: PADDLE_SPEED
  };
  const right: Paddle = {
    x: WIDTH - PADDLE_MARGIN - PADDLE_W,
    y: centerY,
    w: PADDLE_W,
    h: PADDLE_H,
    speed: PADDLE_SPEED
  };
  const ball: Ball = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: BALL_SPEED,
    vy: BALL_SPEED * INITIAL_BALL_VY_RATIO,
    r: BALL_R
  };
  return { width: WIDTH, height: HEIGHT, left, right, ball, scoreL: 0, scoreR: 0, gameOver: false, winner: null };
}

// Clamp makes sure to keep numbers in between two limits
// Keep value within [min, max]
// Example: clamp(120, 0, 100) -> 100; clamp(-5, 0, 100) -> 0
function clamp(n: number, min: number, max: number): number {
  // If n is below the minimum, snap to min
  if (n < min) return min;
  // If n is above the maximum, snap to max
  if (n > max) return max;
  // Otherwise it is already in range
  return n;
}

// Move one paddle according to input (-1, 0, 1)
// Multiplies input by paddle speed and time delta to get a distance.
// Example: dir = 1, speed = 420, dt = 0.016 (~60fps) => ~6.72 pixels moved
// dt == time since last frame in seconds (e.g. 0.016 at 60 FPS)
function movePaddle(p: Paddle, dir: -1 | 0 | 1, dt: number, fieldHeight: number): void {
  p.y += dir * p.speed * dt;
  p.y = clamp(p.y, 0, fieldHeight - p.h); // keep paddle fully on screen
}

// Check if ball overlaps a paddle (treat ball as a circle)
// This finds the closest point on the rectangle to the ball center, then checks if that point is within the ball radius.
// If the paddle is box and the ball a circle: find the spot on the box that is closest to the ball
// measure how far the ball's center is from that spot and if the distance is small enough to still be inside the ball
// if so the ball is touching the box
function ballHitsPaddle(ball: Ball, pad: Paddle): boolean {
  const cx = clamp(ball.x, pad.x, pad.x + pad.w); // closest x on paddle
  const cy = clamp(ball.y, pad.y, pad.y + pad.h); // closest y on paddle
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  return dx * dx + dy * dy <= ball.r * ball.r; // compare squared distances
}

// Reset the ball to center and send it to a side (-1 = left, 1 = right)
// This is called whenever the ball goes out on the left or the right and a point is scored.
function resetBall(state: State, dir: -1 | 1): void {
  state.ball.x = state.width / 2;
  state.ball.y = state.height / 2;
  state.ball.vx = dir * BALL_SPEED;
  state.ball.vy = BALL_SPEED * INITIAL_BALL_VY_RATIO;
}

// Updates everything once per frame
// dt is “delta time” in seconds since the last frame (e.g., ~0.016 at 60fps).
// Using dt makes movement framerate-independent (moves the same on fast/slow PCs).
function update(state: State, inputs: Inputs, dt: number): void {
  // Don't update game logic if game is over
  if (state.gameOver) return;
  // 1) paddles
  movePaddle(state.left, inputs.left, dt, state.height);
  movePaddle(state.right, inputs.right, dt, state.height);

  // 2) ball — position = position + velocity * time
  state.ball.x += state.ball.vx * dt;
  state.ball.y += state.ball.vy * dt;

  // 3) walls (top/bottom): flip vertical velocity when touching edges
  // Bounce only when moving into the wall. This prevents “flip-flip” jitter if the ball overlaps the wall for a few frames.
  const hitTop = state.ball.y - state.ball.r <= 0;
  const hitBottom = state.ball.y + state.ball.r >= state.height;
  const movingUp = state.ball.vy < 0;
  const movingDown = state.ball.vy > 0;
  if (hitTop && movingUp) state.ball.vy = Math.abs(state.ball.vy);      // start moving down
  if (hitBottom && movingDown) state.ball.vy = -Math.abs(state.ball.vy); // start moving up

  // 4) paddles: flip horizontal velocity on hit (simple bounce, no spin)
  // checks if the ball is movign toward a paddle and touching it. if so, bounce with x velocity
  // positive vs moves right, negative vx moves left
  // Math.abs ensures we reflect to the correct side regardless of tiny overlaps
  const hitLeft = state.ball.vx < 0 && ballHitsPaddle(state.ball, state.left);
  const hitRight = state.ball.vx > 0 && ballHitsPaddle(state.ball, state.right);
  if (hitLeft || hitRight) state.ball.vx = -state.ball.vx;

  // 5) scoring: ball left/right out of bounds
  // Adding a small margin to ensure the ball is clearly past the edge.
  const outLeft = state.ball.x < -SCORE_OUT_MARGIN;
  const outRight = state.ball.x > state.width + SCORE_OUT_MARGIN;
  if (outLeft) { 
    state.scoreR += 1; 
    if (state.scoreR >= WINNING_SCORE) {
      state.gameOver = true;
      state.winner = 'right';
    } else {
      resetBall(state, -1); 
    }
  }
  if (outRight) { 
    state.scoreL += 1; 
    if (state.scoreL >= WINNING_SCORE) {
      state.gameOver = true;
      state.winner = 'left';
    } else {
      resetBall(state, 1); 
    }
  }
}

// Draw everything (reads state but does not change it, since there is no game logic here)
// function takes in a 2D canvas context ctx and the gurrent game State s
function draw(ctx: CanvasRenderingContext2D, s: State): void {
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
  if (s.gameOver && s.winner) {
    ctx.fillStyle = '#fbbf24'; // bright yellow for winner text
    ctx.font = '32px system-ui';
    ctx.textAlign = 'center';
    const winnerText = s.winner === 'left' ? 'Left Player Wins!' : 'Right Player Wins!';
    ctx.fillText(winnerText, s.width / 2, s.height / 2);
    ctx.fillText('Refresh to play again', s.width / 2, s.height / 2 + 40);
    ctx.textAlign = 'left'; // reset text alignment
  }
}

// Read keyboard into simple input flags
// W/S control the left paddle; ArrowUp/ArrowDown control the right.
// When the key is released, the direction is set back to 0 (stop)
// global key handler responds to keyboard events anywhere on the webpage
function setupInputs(): Inputs {
  const inputs: Inputs = { left: 0, right: 0 };

  // when a key is pressed, the direction is set to -1 (up) or 1 (down)
  addEventListener('keydown', (e) => {
    if (e.key === 'w') inputs.left = -1;      // left paddle up
    if (e.key === 's') inputs.left = 1;       // left paddle down
    if (e.key === 'ArrowUp') inputs.right = -1;   // right paddle up
    if (e.key === 'ArrowDown') inputs.right = 1;  // right paddle down
  });

  // when a key is released, the direction is set back to 0 (stop)
  addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 's') inputs.left = 0;                 // stop left paddle
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') inputs.right = 0;  // stop right paddle
  });
  return inputs;
}

// Boot the game
// This function wires everything together and starts the animation loop.
function main(): void {
  // Create a canvas and attach it to the page inside the #app container
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const app = document.getElementById('app');
  if (!app) throw new Error('#app not found'); // If the HTML container is missing
  app.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');  // Older/unsupported browsers
  const ctx2 = ctx as CanvasRenderingContext2D; // assert non-null after guard

  const state = createInitialState();  // initial positions and score
  const inputs = setupInputs();        // read keyboard into simple flags

  // requestAnimationFrame tries to call ~60 times per second.
  // We compute dt (seconds passed) so movement is smooth on any machine.
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000); // e.g., 0.016 at ~60fps; cap to avoid big jumps if tab was hidden
    last = now;

    update(state, inputs, dt); // move paddles/ball, handle bounces and scoring
    draw(ctx2, state);         // paint the current state to the screen

    requestAnimationFrame(frame); // schedule the next frame
  }
  requestAnimationFrame(frame);   // kick off the loop
}

// Starts the program after loading the server config from the backend
// init() calls fetchConfig() → GET http://localhost:4000/api/config
async function init(): Promise<void> {
  const cfg = await fetchConfig();
  WINNING_SCORE = cfg.winningScore;
  main();
}

init();
