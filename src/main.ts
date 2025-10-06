// Super simple Pong in TypeScript
// Goal: keep code easy to read and reason about.
// This file:
// 1) defines small data types for paddles, ball, and overall game state
// 2) updates the game each frame (move paddles/ball, bounce, score)
// 3) draws the scene on a <canvas>
// 4) uses requestAnimationFrame to run ~60 times per second
//
// Coordinate system reminder:
// - Canvas origin (0,0) is top-left corner
// - x increases to the right; y increases going down
// - All sizes/positions are in pixels

import { WIDTH, HEIGHT, PADDLE_W, PADDLE_H, PADDLE_SPEED, BALL_R, BALL_SPEED } from './constants';

// Basic shapes — tiny, explicit types keep things approachable
// Example: a paddle at (x=24,y=100) with size 12x80 and speed 420 px/s
// const p: Paddle = { x: 24, y: 100, w: 12, h: 80, speed: 420 };
type Paddle = { x: number; y: number; w: number; h: number; speed: number };

// Ball: position (x,y), velocity (vx,vy), radius r
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
};

// Make the initial game state
// Ball starts centered, moving slightly diagonally; paddles start centered.
function createInitialState(): State {
  const left: Paddle = { x: 24, y: (HEIGHT - PADDLE_H) / 2, w: PADDLE_W, h: PADDLE_H, speed: PADDLE_SPEED };
  const right: Paddle = { x: WIDTH - 24 - PADDLE_W, y: (HEIGHT - PADDLE_H) / 2, w: PADDLE_W, h: PADDLE_H, speed: PADDLE_SPEED };
  const ball: Ball = { x: WIDTH / 2, y: HEIGHT / 2, vx: BALL_SPEED, vy: BALL_SPEED * 0.25, r: BALL_R };
  return { width: WIDTH, height: HEIGHT, left, right, ball, scoreL: 0, scoreR: 0 };
}

// Keep value within [min, max]
// Example: clamp(120, 0, 100) -> 100; clamp(-5, 0, 100) -> 0
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// Move one paddle according to input (-1, 0, 1)
// We multiply input by paddle speed and time delta to get a distance.
// Example: dir = 1, speed = 420, dt = 0.016 (~60fps) => ~6.72 pixels moved
function movePaddle(p: Paddle, dir: -1 | 0 | 1, dt: number, fieldHeight: number): void {
  p.y += dir * p.speed * dt;
  p.y = clamp(p.y, 0, fieldHeight - p.h); // keep paddle fully on screen
}

// Check if ball overlaps a paddle (treat ball as a circle)
// This finds the closest point on the rectangle to the ball center, then checks
// if that point is within the ball radius. Common and simple approach.
function ballHitsPaddle(ball: Ball, pad: Paddle): boolean {
  const cx = clamp(ball.x, pad.x, pad.x + pad.w); // closest x on paddle
  const cy = clamp(ball.y, pad.y, pad.y + pad.h); // closest y on paddle
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  return dx * dx + dy * dy <= ball.r * ball.r; // compare squared distances
}

// Reset the ball to center and send it to a side (-1 = left, 1 = right)
// Useful after scoring so the next rally starts fairly.
function resetBall(state: State, dir: -1 | 1): void {
  state.ball.x = state.width / 2;
  state.ball.y = state.height / 2;
  state.ball.vx = dir * BALL_SPEED;          // horizontal direction
  state.ball.vy = BALL_SPEED * 0.25;         // small vertical angle (keeps it interesting)
}

// Update everything once per frame
// dt is “delta time” in seconds since the last frame (e.g., ~0.016 at 60fps).
// Using dt makes movement framerate-independent (moves the same on fast/slow PCs).
function update(state: State, inputs: Inputs, dt: number): void {
  // 1) paddles
  movePaddle(state.left, inputs.left, dt, state.height);
  movePaddle(state.right, inputs.right, dt, state.height);

  // 2) ball — position = position + velocity * time
  state.ball.x += state.ball.vx * dt;
  state.ball.y += state.ball.vy * dt;

  // 3) walls (top/bottom): flip vertical velocity when touching edges
  // We also check the sign to avoid getting stuck if we overlap slightly.
  if (state.ball.y - state.ball.r <= 0 && state.ball.vy < 0) state.ball.vy *= -1; // bounce up -> down
  if (state.ball.y + state.ball.r >= state.height && state.ball.vy > 0) state.ball.vy *= -1; // bounce down -> up

  // 4) paddles: flip horizontal velocity on hit (simple bounce, no spin)
  // Math.abs ensures we reflect to the correct side regardless of tiny overlaps.
  if (state.ball.vx < 0 && ballHitsPaddle(state.ball, state.left)) state.ball.vx = Math.abs(state.ball.vx);
  if (state.ball.vx > 0 && ballHitsPaddle(state.ball, state.right)) state.ball.vx = -Math.abs(state.ball.vx);

  // 5) scoring: ball left/right out of bounds
  // We add a small margin (50 px) to ensure the ball is clearly past the edge.
  if (state.ball.x < -50) { state.scoreR += 1; resetBall(state, -1); }
  if (state.ball.x > state.width + 50) { state.scoreL += 1; resetBall(state, 1); }
}

// Draw everything
// Important: drawing reads state but does not change it (no game logic here).
function draw(ctx: CanvasRenderingContext2D, s: State): void {
  // background rectangle covering the whole canvas
  ctx.clearRect(0, 0, s.width, s.height);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, s.width, s.height);

  // center line: just visuals to split the field
  ctx.strokeStyle = '#334155';
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(s.width / 2, 0);
  ctx.lineTo(s.width / 2, s.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // paddles
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(s.left.x, s.left.y, s.left.w, s.left.h);
  ctx.fillRect(s.right.x, s.right.y, s.right.w, s.right.h);

  // ball (drawn as a circle)
  ctx.beginPath();
  ctx.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2);
  ctx.fill();

  // score — text drawn near the top
  ctx.fillStyle = '#94a3b8';
  ctx.font = '24px system-ui';
  ctx.fillText(String(s.scoreL), s.width * 0.4, 32);
  ctx.fillText(String(s.scoreR), s.width * 0.6, 32);
}

// Read keyboard into simple input flags
// W/S control the left paddle; ArrowUp/ArrowDown control the right.
// When the key is released, we set the direction back to 0 (stop).
function setupInputs(): Inputs {
  const inputs: Inputs = { left: 0, right: 0 };
  addEventListener('keydown', (e) => {
    if (e.key === 'w') inputs.left = -1;      // left paddle up
    if (e.key === 's') inputs.left = 1;       // left paddle down
    if (e.key === 'ArrowUp') inputs.right = -1;   // right paddle up
    if (e.key === 'ArrowDown') inputs.right = 1;  // right paddle down
  });
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

  const state = createInitialState();  // initial positions and score
  const inputs = setupInputs();        // read keyboard into simple flags

  // requestAnimationFrame tries to call ~60 times per second.
  // We compute dt (seconds passed) so movement is smooth on any machine.
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000); // e.g., 0.016 at ~60fps; cap to avoid big jumps if tab was hidden
    last = now;

    update(state, inputs, dt); // move paddles/ball, handle bounces and scoring
    draw(ctx, state);          // paint the current state to the screen

    requestAnimationFrame(frame); // schedule the next frame
  }
  requestAnimationFrame(frame);   // kick off the loop
}

// starts the program, all above functions are only definitions
main();
