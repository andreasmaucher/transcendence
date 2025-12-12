// ANDY: added this to track when a match is active so we can disable navigation buttons in the topbar
// a match is defined as currently active as soon as the countdown started and until the user gets sent back to the main menu after the game finished 

let isMatchActive = false;
const listeners: Array<(active: boolean) => void> = [];

/**
 * Set the match active state
 * - true: Countdown started or game is running (hide navigation)
 * - false: In menu, profile, or match ended (show navigation)
 */
export function setMatchActive(active: boolean) {
	if (isMatchActive === active) return;
	isMatchActive = active;
	console.log("[MatchState] Match active:", active);
	
	// Notify all listeners
	listeners.forEach(listener => listener(active));
}

/**
 * Get current match active state
 */
export function getMatchActive(): boolean {
	return isMatchActive;
}

/**
 * Subscribe to match state changes
 * Returns unsubscribe function
 */
export function onMatchStateChange(listener: (active: boolean) => void): () => void {
	listeners.push(listener);
	// Immediately call with current state
	listener(isMatchActive);
	
	// Return unsubscribe function
	return () => {
		const index = listeners.indexOf(listener);
		if (index > -1) {
			listeners.splice(index, 1);
		}
	};
}
