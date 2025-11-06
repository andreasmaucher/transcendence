import cloudinary from "../config/cloudinary.js";

export async function uploadAvatar(filePath: string) {
	try {
		const result = await cloudinary.uploader.upload(filePath, {
			folder: "transcendence/avatars",
		});
		console.log("Avatar uploaded:", result.secure_url);
		return result.secure_url;
	} catch (error) {
		throw new Error(
			"[Cloudinary] Failed to upload avatar: " + (error as Error).message
		);
	}
}
