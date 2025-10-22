// Central source of gameplay constants for the backend and (via API) the frontend

export const GAME_CONSTANTS = {
  // Field dimensions
  FIELD_WIDTH: 800,
  FIELD_HEIGHT: 450,

  // Paddle configuration
  PADDLE_WIDTH: 12,
  PADDLE_HEIGHT: 80,
  PADDLE_MARGIN: 24,
  PADDLE_SPEED: 420,

  // Ball configuration
  BALL_RADIUS: 8,
  BALL_SPEED: 360,
  INITIAL_BALL_VY_RATIO: 0.25,

  // Game rules
  SCORE_OUT_MARGIN: 50,
  WINNING_SCORE: Number(process.env.WINNING_SCORE ?? 11),
  UPDATE_FPS: 60,
} as const;

export type GameConstants = typeof GAME_CONSTANTS;

