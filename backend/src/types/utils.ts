
export type User = {
	id: number;
	username: string;
	password: string;
	avatar: string;
	friends: User[];
	stats: string | null;
	created_at: string;
}