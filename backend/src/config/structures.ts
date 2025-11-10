import { SingleGame, Tournament } from "../types/game.js";
import { Match } from "../types/match.js";
import { User } from "../types/utils.js";

export const singleGames = new Map<string, SingleGame>();
export const tournaments = new Map<string, Tournament>();
export const matches = new Map<string, Match>();
export const usersOnline = new Map<string, User>();
