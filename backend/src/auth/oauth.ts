import { FastifyReply } from "fastify";

// Setting a cookie to make sure the browser that starts the GitHub login is the same browser that finishes it
// -> prevent CSRF attacks and login hijacking
// Flow:
// 1. User clicks "Login with GitHub" button
// 2. Browser sends request to backend to start OAuth flow
// 3. Backend sets a cookie with a random value
// 4. Browser redirects to GitHub login page
// 5. User logs in to GitHub
// 6. GitHub redirects back to the backend with the code and state
// 7. Backend verifies the state cookie and exchanges the code for an access token
// 8. Backend creates a session and redirects to the frontend
// 9. Browser sends request to backend to finish OAuth flow
// - SameSite=Lax: allows the cookie on the OAuth redirect back, blocks most CSRF
// - Max-Age=600: expires in 10 minutes
// - Path=/ : cookie is valid for the whole site
export function setStateCookie(reply: FastifyReply, state: string) {
	const cookie = [`oauth_state=${state}`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=600"].join("; ");
	reply.header("Set-Cookie", cookie);
}

// Break the cookie header into individual key=value pairs
export function readCookie(header: string | undefined, name: string): string | undefined {
	if (!header) return undefined; // OAuth attempt will be rejected and the user must try again
	const pairs = header.split(";"); // browser sends cookie header e.g.: "sid=abc123; oauth_state=XYZ789"
	// loop over each cookie key=value string in the pairs array
	for (const pair of pairs) {
		const trimmed = pair.trim();
		if (!trimmed) continue; // if the chunk is empty after trimming, skip it

		const equal_index = trimmed.indexOf("="); // find the index of the equal sign
		if (equal_index === -1) continue; // if no equal sign is found, skip it

		const key = trimmed.slice(0, equal_index); // key (left of the equal sign)
		const value = trimmed.slice(equal_index + 1); // value (right of the equal sign)

		if (key === name) return value;
	}
	return undefined;
}
