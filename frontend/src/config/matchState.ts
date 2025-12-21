//  added this to track when a match is active so we can disable navigation buttons in the topbar
// a match is defined as currently active as soon as the countdown started and until the user gets sent back to the main menu after the game finished 

// true: Countdown started or game is running (hide navigation)
// false: In menu, profile, or match ended (show navigation)
let isMatchActive = false;
const listeners: Array<(active: boolean) => void> = [];

// when match starts set match state to active
export function setMatchActive(active: boolean) {
	if (isMatchActive === active) return;
	isMatchActive = active;
	
	// notify all listeners
	listeners.forEach(listener => listener(active));
}

// Get current match active state
export function getMatchActive(): boolean {
	return isMatchActive;
}

// subscribe to match state changes to be notified when it changes
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
