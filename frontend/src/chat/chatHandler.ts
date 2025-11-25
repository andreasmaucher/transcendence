import { userData } from "../config/constants";
import { ChatEvent, chatHistory, Message } from "./types";

export function sendMessage(
	type: ChatEvent,
	content: string,
	receiver: string | null = null,
	gameId: any | null = null
) {
	const message: Message = {
		id: undefined,
		sender: userData.username!,
		receiver: receiver ?? undefined,
		type: type,
		content: content,
		gameId: gameId ?? undefined,
		sentAt: undefined,
	};
	if (userData.userSock?.readyState === WebSocket.OPEN) {
		userData.userSock.send(JSON.stringify(message));
		console.log(`Message sent ${message.type}`);
	}
}

export function renderIncomingMessage(message: Message, chatMessages: HTMLElement) {
	const item = document.createElement("div");
	item.className = "chat-message";
	item.style.padding = "6px 8px";
	item.style.marginBottom = "6px";
	item.style.background = "rgba(255,255,255,0.08)";
	item.style.borderRadius = "4px";
	item.style.cursor = "pointer";

	item.innerHTML = `
	<strong>${message.sender}</strong><br>
	<span>${message.content}</span><br>
	<small>${message.sentAt}</small><br>`;

	chatMessages.append(item);
	chatMessages.scrollTop = chatMessages.scrollHeight;
}

export function setupPrivateChathistory(chatHistory: chatHistory, username: string): Message[] {
	debugPrintGlobalHistory(chatHistory);
	if (!chatHistory.private.has(username)) {
		chatHistory.private.set(username, []);
		console.log("I have no private Chat");
	}
	return chatHistory.private.get(username)!;
}

export function renderOnlineUsers(
	friendList: HTMLElement,
	chatMessages: HTMLElement,
	chatHeader: HTMLElement,
	activePrivateChat: { current: string | null },
	usersOnline: string[],
	chatHistory: chatHistory,
	message: Message
) {
	friendList.innerHTML = "";
	usersOnline.forEach((username) => {
		// create a container
		const wrapper = document.createElement("div");
		wrapper.style.display = "flex";
		wrapper.style.flexDirection = "column";
		wrapper.style.marginBottom = "10px";

		const userItem = document.createElement("div");
		userItem.textContent = username;
		userItem.style.padding = "6px 8px";
		userItem.style.marginBottom = "6px";
		userItem.style.background = "rgba(255,255,255,0.08)";
		userItem.style.borderRadius = "4px";
		userItem.style.cursor = "pointer";
		userItem.classList.add("online-user");

		// Create Friendslist
		userItem.onclick = () => {
			if (username === "Global Chat") {
				activePrivateChat.current = "global";
				chatHeader.textContent = `Global Chat`;
			} else {
				activePrivateChat.current = username;
				chatHeader.textContent = `Live_Chat with ${username}`;
			}
			chatMessages.innerHTML = "";
			populateChatWindow(chatHistory, chatMessages, username, activePrivateChat!);
		};

		// Create Buttons for Friendlist
		if (username !== "Global Chat") {
			const btnRow = document.createElement("div");
			btnRow.style.display = "flex";
			btnRow.style.gap = "4px";

			// --- Button 1 ---
			const btn1 = document.createElement("button");
			btn1.textContent = "A";
			btn1.style.padding = "2px 6px";
			btn1.style.fontSize = "10px";
			btn1.onclick = (e) => {
				e.stopPropagation();
				console.log("Button A clicked for", username);
			};

			// --- Button 2 ---
			const btn2 = document.createElement("button");
			btn2.textContent = "B";
			btn2.style.padding = "2px 6px";
			btn2.style.fontSize = "10px";
			btn2.onclick = (e) => {
				e.stopPropagation();
				console.log("Button B clicked for", username);
			};

			// --- Button 3 ---
			const btn3 = document.createElement("button");
			btn3.textContent = "C";
			btn3.style.padding = "2px 6px";
			btn3.style.fontSize = "10px";
			btn3.onclick = (e) => {
				e.stopPropagation();
				console.log("Button C clicked for", username);
			};

			btnRow.append(btn1, btn2, btn3);
			wrapper.append(userItem, btnRow);
		} else {
			// No buttons for globalChat
			wrapper.append(userItem);
		}
		friendList.append(wrapper);
	});
}

export function populateUserOnlineList(msg: Message, username: string | null = null): string[] {
	let onlineList: string[] = [];

	if (!msg.onlineUser) return [];
	onlineList.push("Global Chat");
	msg.onlineUser.forEach((user) => {
		if (username !== user) onlineList.push(user);
	});
	return onlineList;
}

// TODO Problems with fetching the Message[] from private
export function populateChatWindow(
	chatHistory: chatHistory,
	chatMessages: HTMLElement,
	username: string,
	activePrivateChat: { current: string | null }
) {
	chatMessages.innerHTML = "";

	let chatHistoryToAdd: Message[] = [];
	if (activePrivateChat.current === "global" || activePrivateChat.current === null) {
		chatHistoryToAdd = chatHistory.global;
		console.log("GlobalChatHistory should be loaded!");
	} else {
		chatHistoryToAdd = setupPrivateChathistory(chatHistory, username);
		console.log(`private chatHistory for ${activePrivateChat.current} loaded!`);
	}
	// DEBUG
	chatHistoryToAdd.forEach((msg, idx) => {
		console.log(`#${idx + 1}: [${msg.sentAt}] ${msg.sender}: ${msg.content}`);
	});
	chatHistoryToAdd.forEach((message) => {
		renderIncomingMessage(message, chatMessages);
	});
}

export function appendMessageToHistory(chatHistory: chatHistory, message: Message): void {
	if (message.type === "broadcast") {
		chatHistory.global.push(message);
		return;
	}
	if (message.type === "direct") {
		const otherUser = message.sender === chatHistory.user ? message.receiver : message.sender;
		if (!otherUser) return;
		if (!chatHistory.private.has(otherUser)) chatHistory.private.set(otherUser, []);
		chatHistory.private.get(otherUser)!.push(message);
		return;
	}
	if (message.type === "tournament") {
		chatHistory.tournament.push(message);
		return;
	}
}

// FOR THE DEBUGGING PART
export function debugPrintGlobalHistory(chatHistory: chatHistory | undefined) {
	if (!chatHistory) {
		console.log("⚠ No chatHistory available yet.");
		return;
	}

	if (chatHistory.global.length === 0) {
		console.log("ℹ Global chat is empty.");
		return;
	}

	console.log("🌍 Global Chat History:");
	chatHistory.global.forEach((msg, idx) => {
		console.log(`#${idx + 1}: [${msg.sentAt}] ${msg.sender}: ${msg.content}`);
	});
}

export function wireIncomingChat(
	chatMessages: HTMLElement,
	friendList: HTMLElement,
	chatHeader: HTMLElement,
	activePrivateChat: { current: string | null },
	userOnlineList: string[]
): () => void {
	let chatHistory: chatHistory;
	//let lastChatHistoryloaded: {current: string | null } = {current: null}

	const ws = userData.userSock;
	if (!ws) {
		console.warn("Chat socket not connected");
		// returns empty function
		return () => {};
	}

	const previousHandler = ws.onmessage;
	userOnlineList.splice(0, userOnlineList.length, "Global Chat");

	ws.onmessage = (event) => {
		try {
			//const msg: Message =
			const payload = JSON.parse(event.data);
			if (payload && payload.type == "chat") {
				const msg: Message = payload.data;
				console.log("WS EVENT:", msg);

				switch (msg.type) {
					/* case "init": {
						chatHistory = msg.chatHistory!;
						chatHistory.private = ensureMap(chatHistory.private);
						//debugPrintGlobalHistory(chatHistory);
						console.log("TYPE OF PRIVATE:", chatHistory.private);
						console.log("IS MAP?", chatHistory.private instanceof Map);
						console.log("ENTRIES:", chatHistory.private);
						populateChatWindow(chatHistory!, chatMessages, sockets.username!, activePrivateChat);
						console.log(`Init chatHistory for ${sockets.username}`);
						break;
					} */
					case "broadcast": {
						if (activePrivateChat.current === null || activePrivateChat.current === "global")
							renderIncomingMessage(msg, chatMessages);
						appendMessageToHistory(userData.chatHistory!, msg);
						break;
					}
					case "direct": {
						if (activePrivateChat.current === msg.sender || activePrivateChat.current === msg.receiver)
							renderIncomingMessage(msg, chatMessages);
						appendMessageToHistory(userData.chatHistory!, msg);
						break;
					}
					case "onlineUser": {
						// Update onlineUserList in the frontend
						userOnlineList.splice(0, userOnlineList.length, ...populateUserOnlineList(msg, userData.username));
						console.log(`OnlineUserList: ${userOnlineList}`);

						// build the chat
						renderOnlineUsers(
							friendList,
							chatMessages,
							chatHeader,
							activePrivateChat,
							userOnlineList,
							userData.chatHistory!,
							msg
						);
						break;
					}
				}
			}
		} catch (err) {
			console.error("Failed to parse incoming chat message", err);
		}
	};

	return () => {
		ws.onmessage = previousHandler ?? null;
	};
}

// HELPER /////////////////////////////////////////////////////////////////////
function ensureMap<T>(input: any): Map<string, T> {
	if (input instanceof Map) return input;
	if (Array.isArray(input)) {
		// input = [ [username, Message[]], ... ]
		return new Map(input as [string, T][]);
	}
	// Fallback für Objekt-Form { username: Message[] }
	return new Map(Object.entries(input || {})) as Map<string, T>;
}
