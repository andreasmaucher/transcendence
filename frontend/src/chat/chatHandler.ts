import { generalData, userData } from "../config/constants";
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

// RENDER FUNCTIONS ///////////////////////////////////////////////////////////

export function renderIncomingMessage(message: Message, chatMessages: HTMLElement) {
	const item = document.createElement("div");
	item.className = "chat-message";
	item.style.padding = "6px 8px";
	item.style.marginBottom = "6px";
	item.style.background = "rgba(255,255,255,0.08)";
	item.style.borderRadius = "4px";
	item.style.cursor = "pointer";

	item.innerHTML = `
	<div style="display:flex; justify-content:space-between; font-size:12px;">
		<strong>${message.sender}</strong>
		<small>${message.sentAt}</small>
	</div>
	<span>${message.content}</span>
	`;

	chatMessages.append(item);
	requestAnimationFrame(() => {
		chatMessages.scrollTop = chatMessages.scrollHeight;
	});
}

export function renderChatHeaderButtons(
	chatHeader: HTMLElement,
	activeChat: string | null
) {
	chatHeader.innerHTML = "";

	const title = document.createElement("span");
	title.textContent =
		activeChat === "Global Chat"
			? "Global Chat"
			: `Chat with ${activeChat}`;

	title.style.flex = "1";
	title.style.fontWeight = "bold";

	chatHeader.style.display = "flex";
	chatHeader.style.alignItems = "flex-start"; 
	chatHeader.style.justifyContent = "space-between";
	chatHeader.style.paddingTop = "0px";
	chatHeader.style.paddingBottom = "2px";


	if (activeChat === "Global Chat") {
		chatHeader.append(title);
		return;
	}

	// Button-container
	const btnRow = document.createElement("div");
	btnRow.style.display = "flex";
	btnRow.style.gap = "6px";
	btnRow.style.marginTop = "-3px";
	btnRow.style.transform = "translateY(-1px)";

	const createIconBtn = (
		symbol: string, 
		title: string, 
		action: () => void,
		blocked: boolean = false
	) => {
		const btn = document.createElement("button");
		btn.textContent = symbol;
		btn.title = title;
		btn.style.padding = "4px 6px";
		btn.style.fontSize = "14px";
		btn.style.borderRadius = "4px";
		btn.style.border = "1px solid #666";
		btn.style.background = blocked 
		? "rgba(255, 0, 0, 0.58)"
		: "rgba(255,255,255,0.12)";
		btn.style.cursor = "pointer";
		btn.onclick = (e) => {
			e.stopPropagation();
			action();
		};
		return btn;
	};

	const btnProfile = createIconBtn("👤", "Open profile", () => {
		window.location.href = `/profile/${activeChat}`;
	});

	const btnDuel = createIconBtn("⚔️", "Challenge to match", () => {
		console.log(`⚔️ Challenge sent to ${activeChat}`);
	});

	// TODO: Check if this is handed out with the chatHistory (empty?)
	if (!userData.blockedUsers)
		userData.blockedUsers = [];
	const isBlocked = userData.blockedUsers?.includes(activeChat!);

	const btnBlock = createIconBtn(
		isBlocked? "♻️": "🚫",
		isBlocked? "Unblock user" : "Block user",
		() => {
		if (!isBlocked){
			userData.blockedUsers?.push(activeChat!);
			sendMessage('block', `You've blocked ${activeChat}`, activeChat);
			console.log(`🚫 User ${activeChat} was blocked`);
		} else {
			userData.blockedUsers = userData.blockedUsers!.filter(u => u !== activeChat);
			sendMessage("unblock", `You've unblocked ${activeChat}`, activeChat);
			console.log(`♻️ User ${activeChat} was UNBLOCKED`);
		}
		renderChatHeaderButtons(chatHeader, activeChat);
	}, 
	isBlocked
	);

	btnRow.append(btnProfile, btnDuel, btnBlock);

	chatHeader.append(title, btnRow);
}

export function renderOnlineUsers(
	friendList: HTMLElement,
	chatMessages: HTMLElement,
	chatHeader: HTMLElement,
	activePrivateChat: { current: string | null },
) {
	friendList.innerHTML = "";
	generalData.onlineUsers!.forEach((username) => {

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
				activePrivateChat.current = "Global Chat";
				chatHeader.textContent = `Global Chat`;
			} else {
				activePrivateChat.current = username;
				chatHeader.textContent = `Chat with ${username}`;
			}
			chatMessages.innerHTML = "";
			populateChatWindow(userData.chatHistory!, chatMessages, username, activePrivateChat!);
			renderChatHeaderButtons(chatHeader, activePrivateChat.current);
		};
		friendList.append(userItem);
	});
}

// METHODS /////////////////////////////////////////////////////////////////////

export function setupPrivateChathistory(username: string): Message[] {
	if (!userData.chatHistory!.private.has(username)) {
		userData.chatHistory!.private.set(username, []);
		console.log("I have no private Chat");
	}
	return userData.chatHistory!.private.get(username)!;
}

export function populateOnlineUserList(username: string | null = null): string[] {
	let onlineList: string[] = [];

	if (!generalData.onlineUsers) return ["Global Chat"];
	onlineList.push("Global Chat");
	generalData.onlineUsers.forEach((user) => {
		console.log(`${user} is online!`)
		if (username !== user) onlineList.push(user);
	});
	return onlineList;
}

export function addOnlineUser(username: string) {
	if (!generalData.onlineUsers!.includes(username))
		generalData.onlineUsers!.push(username);
	if (!generalData.allUsers?.includes(username))
		generalData.allUsers?.push(username);
}

export function removeOnlineUser(onlineUserList: string[], username: string) {
	const index = onlineUserList.indexOf(username);
	if (index !== -1) {
		onlineUserList.splice(index, 1);
	}
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
	if (activePrivateChat.current === "Global Chat") {
		chatHistoryToAdd = chatHistory.global.reverse();
		console.log("GlobalChatHistory should be loaded!");
	} else {
		chatHistoryToAdd = setupPrivateChathistory(username);
		chatHistoryToAdd.reverse();
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

export function appendMessageToHistory(message: Message): void {
	if (message.type === "broadcast") {
		userData.chatHistory!.global.push(message);
		return;
	}
	if (message.type === "direct") {
		const otherUser = message.sender === userData.chatHistory!.user ? message.receiver : message.sender;
		if (!otherUser) return;
		if (!userData.chatHistory!.private.has(otherUser)) userData.chatHistory!.private.set(otherUser, []);
			userData.chatHistory!.private.get(otherUser)!.push(message);
		return;
	}
	if (message.type === "tournament") {
		userData.chatHistory!.tournament.push(message);
		return;
	}
}

// FOR DEBUGGING
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
	activePrivateChat: { current: string | null }
): () => void {
	const ws = userData.userSock;
	if (!ws) {
		console.warn("Chat socket not connected");
		// returns empty function
		return () => {};
	}

	const previousHandler = ws.onmessage;

	generalData.onlineUsers = populateOnlineUserList(userData.username);
	populateChatWindow(userData.chatHistory!, chatMessages, userData.username!, activePrivateChat);
	renderOnlineUsers(friendList, chatMessages, chatHeader, activePrivateChat);

	ws.onmessage = (event) => {
		try {
			const payload = JSON.parse(event.data);
			if (payload && payload.type === "chat") {
				const msg: Message = payload.data;
				console.log("WS EVENT:", msg);

				switch (msg.type) {
					case "broadcast": {
						if (activePrivateChat.current === "Global Chat")
							renderIncomingMessage(msg, chatMessages);
						appendMessageToHistory(msg);
						break;
					}
					case "direct": {
						if ((activePrivateChat.current === msg.sender || activePrivateChat.current === msg.receiver)
						&& !userData.blockedUsers?.includes(msg.sender))
							renderIncomingMessage(msg, chatMessages);
						appendMessageToHistory(msg);
						break;
					}
				}
			}

			if (payload && payload.type == "user-online") {
				const newUserOnline = payload.data.username;
				console.log(`${newUserOnline} entered the realm!`)
				addOnlineUser(newUserOnline);
				renderOnlineUsers(
							friendList,
							chatMessages,
							chatHeader,
							activePrivateChat,
						);
					}

			if (payload && payload.type == "user-offline") {
				const newUserOffline = payload.data.username;
				console.log(`${newUserOffline} left the realm!`)
				addOnlineUser(newUserOffline);
				renderOnlineUsers(
							friendList,
							chatMessages,
							chatHeader,
							activePrivateChat,
						);
					}
				
		} catch (err) {
			console.error("Failed to parse incoming payload", err);
		}
	};

	return () => {
		ws.onmessage = previousHandler ?? null;
	};
}
