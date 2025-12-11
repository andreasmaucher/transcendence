// Central source of gameplay constants for the backend and (via API) the frontend
const BALL_SPEED = 360;

export const GAME_CONSTANTS = {
	// Field dimensions
	FIELD_WIDTH: 800,
	FIELD_HEIGHT: 450,

	// Paddle configuration
	PADDLE_WIDTH: 12,
	PADDLE_HEIGHT: 80,
	PADDLE_MARGIN: 24, // how far each paddle is from the wall
	PADDLE_SPEED: 420,

	// Ball configuration
	BALL_RADIUS: 8,
	BALL_SPEED,
	INITIAL_BALL_VY_RATIO: 0.25, // so the ball doesnt move straight in the beginning

	// Game rules
	SCORE_OUT_MARGIN: 50, // how far the ball must be behind the wall to score a point (needs to fully cross)
	WINNING_SCORE: Number(process.env.WINNING_SCORE),
	// NOTE: game pyhsics already use dt so speed wont change with fps, only how often the game is updated
	UPDATE_FPS: 60,
	IMPACT_OFFSET_SPIN_SCALE: 0.9, // how strongly off-center impact modifies vy
	PADDLE_MOVE_SPIN_SCALE: 0.35, // how strongly paddle vertical velocity adds spin
	MAX_VY: BALL_SPEED * 0.85, // cap vertical speed
} as const;

export type GameConstants = typeof GAME_CONSTANTS;

export const DEFAULT_AVATAR_URL =
	"https://res.cloudinary.com/dtl48kr1u/image/upload/v1762435054/transcendence/default-user_h8r9yj.jpg";
