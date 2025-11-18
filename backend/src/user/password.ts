import { getUserByUsernameDB } from "../database/users/getters.js";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10; // security cost factor

export async function verifyPassword(userId: string, password: string): Promise<boolean> {
	try {
		const user: any = getUserByUsernameDB(userId);
		const match = await bcrypt.compare(password, user.password);
		return match;
	} catch (error: any) {
		console.log(error.message);
		return false;
	}
}

export async function hashPassword(plainPassword: string): Promise<string> {
	const hashPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
	return hashPassword;
}
