// Global variables

import { chatHistory } from "../chat/types";

export const generalData = {
  onlineUsers: null as string[] | null,
  allUsers: null as string[] | null,
};

export const userData = {
  username: null as string | null,
  userSock: null as WebSocket | null,
  gameSock: null as WebSocket | null,
  chatHistory: null as chatHistory | null,

  // Always arrays — never null
  friends: [] as string[],
  blockedUsers: [] as string[],
};

// For chat block logic
export const blockedUsers = new Map<string, string[]>();
