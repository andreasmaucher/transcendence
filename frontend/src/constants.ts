// Visual style constants (colors, fonts, etc.)
// Centralizing colors makes it easy to theme the game from one place.

export const COLOR_BACKGROUND = '#0f172a';        // main background color
export const COLOR_CENTERLINE = '#334155';       // center dashed line color
export const COLOR_PADDLE_BALL_LIGHT = '#e2e8f0';      // paddles and ball fill color
export const COLOR_SCORE = '#94a3b8';        // scoreboard text color

// Font constants
export const FONT_SCORE = '24px system-ui';  // scoreboard font

// Types for gameplay constants fetched from the backend
export type GameConstants = {
  fieldWidth: number;
  fieldHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  paddleMargin: number;
  paddleSpeed: number;
  ballRadius: number;
  ballSpeed: number;
  initialBallVyRatio: number;
  scoreOutMargin: number;
  winningScore: number;
  updateFps: number;
};
