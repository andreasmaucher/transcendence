// this variabel is a union type that says this can be a WebSocket or null
// union types require a check for null before using the variable
// types only exist at compile time, so they are not checked at runtime

import { Direction, PaddleSide } from "../types/game";

// this is why it is necessary to check for null before using the variable
let activeSocket: WebSocket | null = null;

// track which paddle side a player controls (null = local game where both paddles are controlled in one window)
let assignedSide: PaddleSide | null = null;

// callback to notify UI when side is assigned
let onSideAssignedCallback: ((side: PaddleSide) => void) | null = null;

// set the active socket to the given WebSocket
// if it is null, the active socket is not set and we stop sending input commands to the backend
// this is triggered in main.ts when the WebSocket connection is established or lost
export function setActiveSocket(ws: WebSocket | null): void {
	activeSocket = ws;
}

// set which paddle side a player controls
export function setAssignedSide(side: PaddleSide | null): void {
	assignedSide = side;
	console.log(`[INPUT] Assigned to control: ${side || "both paddles (local mode)"}`);
	
	//! LOGIC to make sure players see which paddle they are controlling (message printed in the UI)
	// notify UI if callback is registered and side is not null
	if (side && onSideAssignedCallback) {
		onSideAssignedCallback(side);
	}
}

// register a callback to be notified when player side is assigned
export function onSideAssigned(callback: (side: PaddleSide) => void): void {
	onSideAssignedCallback = callback;
}

// object to keep track of the last sent direction for each paddle
// used in the queueInput function below
const lastSent: Record<PaddleSide, Direction> = { left: "stop", right: "stop" };

// array to keep track of the input commands that are pending to be sent to the backend
// used in the queueInput function below
const pendingInputs: Array<{ paddle: PaddleSide; direction: Direction }> = [];

// queue an input command for a paddle to move in a certain direction
export function queueInput(paddle: PaddleSide, direction: Direction): void {
	const current = lastSent[paddle]; // get the last sent direction for this paddle
	// if the current direction is the same as the new direction and the new direction is not stop, do nothing
	if (current === direction && direction !== "stop") return;
	pendingInputs.push({ paddle, direction }); // add the new input command to the queue
	flushInputs(); // send the input commands to the backend
}

// flush the input queue by sending input commands from players to the backend
export function flushInputs(): void {
	// if the socket is not connected or not open, do nothing
	if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) return;
	// loop through the pendingInputs array and send each input command to the backend
	while (pendingInputs.length) {
		const cmd = pendingInputs.shift(); // shift() removes and returns the first item from the array
		if (!cmd) break;
		lastSent[cmd.paddle] = cmd.direction; // update the last sent direction for this paddle
		// try to send the input command to the backend
		try {
			activeSocket.send(JSON.stringify({ type: "input", paddle: cmd.paddle, direction: cmd.direction }));
		} catch (err) {
			//! TODO: if this retry design is still needed in the future, add MAX_RETRIES to avoid infinite retries
			// push command back to the front of the queue for retry
			pendingInputs.unshift(cmd);
			break;
		}
	}
}

// sets up event listeners to capture keyboard input and convert it into movements
export function setupInputs(): void {
	// when a key is pressed down
	addEventListener("keydown", (e) => {
		// in local mode allow both paddles and in online mode, only allow the assigned paddle
		if ((assignedSide === null || assignedSide === "left") && e.key === "w") queueInput("left", "up");
		if ((assignedSide === null || assignedSide === "left") && e.key === "s") queueInput("left", "down");
		if ((assignedSide === null || assignedSide === "right") && e.key === "ArrowUp") queueInput("right", "up");
		if ((assignedSide === null || assignedSide === "right") && e.key === "ArrowDown") queueInput("right", "down");
	});

	// when a key is released
	addEventListener("keyup", (e) => {
		if ((assignedSide === null || assignedSide === "left") && (e.key === "w" || e.key === "s")) queueInput("left", "stop");
		if ((assignedSide === null || assignedSide === "right") && (e.key === "ArrowUp" || e.key === "ArrowDown")) queueInput("right", "stop");
	});
}
