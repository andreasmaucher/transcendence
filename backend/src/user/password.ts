import { getJsonUserByUsername } from "../database/helpers/user_getters.js";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10; // security cost factor

export async function verifyPassword(password: string, userId: string): Promise<boolean> {
	try {
		const user: any = getJsonUserByUsername(userId);
		const match = await bcrypt.compare(password, user.password);
		return match;
	} catch (error : any) {
		console.log(error.message);
		return false;
	}
}

export async function hashPassword(plainPassword: string): Promise<string> {
	const hashPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
	return hashPassword;
}