// DATABASE STRUCTURES

import { TournamentMatchType } from "./match.js";

export type UserDB = {
	internal_id: number;
	username: string;
	password: string;
	provider: string; // External auth provider (e.g. Github)
	provider_id: string | null;
	avatar: string;
	friends: string[];
	stats: string | null;
	created_at: string;
};

export type TournamentDB = {
	internal_id: number;
	id: string;
	name: string;
	size: number;
	winner: string | null;
	started_at: string | null;
	ended_at: string | null;
	notes: string | null;
};

export type MatchDB = {
	internal_id: number;
	id: string;
	mode: string;
	player_left_id: string | null; //Reference to user table
	player_right_id: string | null; //Reference to user table
	tournament_id: string | null; //Reference to tournament table
	round: number;
	in_tournament_type: TournamentMatchType | null;
	in_tournament_placement_range: string | null;
	score_left: number;
	score_right: number;
	winner: string | null;
	started_at: string | null;
	ended_at: string | null;
	notes: string | null;
};

export type MessageDB = {
	internal_id: number;
	id: string;
	sender: string; // Reference to the user table
	receiver: string | null; // Reference to the user table
	type: string;
	content?: string;
	game_id?: string;
	sent_at: string;
};
