// WS PAYLOAD RELATED TYPES

export type BackendStateMessage = {
	isRunning: boolean;
	width: number;
	height: number;
	paddles: { left: { y: number }; right: { y: number } };
	ball: { x: number; y: number; vx: number; vy: number; r: number };
	score: { left: number; right: number };
	isOver: boolean;
	winner: "left" | "right" | null;
	winningScore: number;
	tick: number;
};

export type PayloadTypes = "state" | "waiting" | "countdown" | "start" | "chat";
export type PayloadDataTypes = { value: number } | BackendStateMessage | undefined;

export type Payload = {
	type: string;
	data: any; // any for now but it should be PayloadDataTypes
};
