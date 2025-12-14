export function isValidInput(input: string | null | undefined): boolean {
	// 1. Check for null, undefined, or empty string ""
	if (!input) return false;

	// 2. Check content (letters and numbers only)
	const regex = /^[a-zA-Z0-9]+$/;
	return regex.test(input);
}

export function sanitizeInput(input: string): string {
    if (!input) return "";

    // 1. Trim whitespace from start and end
    let clean = input.trim();

    // 2. Escape HTML characters to prevent XSS (Cross-Site Scripting)
    //    converts < to &lt;, > to &gt;, etc.
    clean = clean
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    return clean;
}
