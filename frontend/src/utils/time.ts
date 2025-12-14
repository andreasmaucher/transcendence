export function convertUTCStringToLocal(dateString: string): string {
	// 1. Transform "YYYY-MM-DD HH:mm:ss" to "YYYY-MM-DDTHH:mm:ssZ"
	// This explicitly tells the Date object: "This time is in UTC"
	const isoUtcString = dateString.replace(" ", "T") + "Z";
	const date = new Date(isoUtcString);

	// Safety check
	if (isNaN(date.getTime())) {
		throw new Error("Invalid date format provided");
	}

	// 2. Helper to pad single digits (e.g., 9 -> "09")
	const pad = (num: number): string => num.toString().padStart(2, "0");

	// 3. Extract components using LOCAL system time methods
	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1); // Months are 0-indexed
	const day = pad(date.getDate());
	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());
	const seconds = pad(date.getSeconds());

	// 4. Return in the requested format
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
