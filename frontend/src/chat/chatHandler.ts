import { sockets } from "../config/constants";
import { ChatEvent, chatHistory, Message } from "./types";

export function sendMessage(
	type: ChatEvent, 
	content: string, 
	receiver: string | null = null, 
	gameId: any | null = null) {
	const messageId = crypto.randomUUID();
	const message: Message = {
		id: messageId,
		sender: sockets.username!,
		receiver: receiver ?? undefined,
		type: type,
		content: content,
		gameId: gameId ?? undefined,
		sentAt: undefined,
	};
	if (sockets.user?.readyState === WebSocket.OPEN) {
		sockets.user.send(JSON.stringify(message));
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

export function setupPrivateChathistory(
	chatHistory: chatHistory, 
	username: string
) : Message[] {
	if (!chatHistory.private.has(username))
		chatHistory.private.set(username, []);
	return chatHistory.private.get(username)!;
}

export function renderOnlineUsers(
	friendList: HTMLElement, 
	chatMessages: HTMLElement,
	chatHeader: HTMLElement,
	activePrivateChat: {current: string | null}, 
	usersOnline: string[],
	chatHistory: chatHistory) {

	friendList.innerHTML = "";
	usersOnline.forEach((username) => {
		const item = document.createElement("div");
		item.textContent = username;
		item.style.padding = "6px 8px";
		item.style.marginBottom = "6px";
		item.style.background = "rgba(255,255,255,0.08)";
		item.style.borderRadius = "4px";
		item.style.cursor = "pointer";
		item.classList.add("online-user");
		
		item.onclick = () => {
			if (username === "Global Chat") {
				activePrivateChat.current = null;
				chatHeader.textContent = `Global Chat`;
				chatMessages.innerHTML = "";
				const history = chatHistory.global;
				history.forEach((m) => renderIncomingMessage(m, chatMessages));
			} else {
				activePrivateChat.current = username;
				chatHeader.textContent = `Live_Chat with ${username}`;
				chatMessages.innerHTML = "";
				const history = setupPrivateChathistory(chatHistory, username);
				history.forEach((m) => renderIncomingMessage(m, chatMessages));
			}
		}
		friendList.append(item);
	});
}

export function populateUserOnlineList(msg: Message, username: string | null = null) : string[] {
	let onlineList: string[] = [];

	if (!msg.onlineUser)
		return [];
	onlineList.push("Global Chat");
	msg.onlineUser.forEach((user) => {
		if (username !== user)
			onlineList.push(user);
	});
	return onlineList;
}

export function populateChatWindow(chatHistory: chatHistory, chatMessages: HTMLElement) {
	const globalChat = chatHistory.global;
	globalChat.forEach((message) => {
		renderIncomingMessage(message, chatMessages);
	});
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
		console.log(
			`#${idx + 1}: [${msg.sentAt}] ${msg.sender}: ${msg.content}`
		);
	});
}

export function wireIncomingChat(
	chatMessages: HTMLElement, 
	friendList: HTMLElement,
	chatHeader: HTMLElement,
	activePrivateChat: {current: string | null},
	userOnlineList: string[]
	): () => void {

	let chatHistory: chatHistory | undefined;

	const ws = sockets.user;
	if (!ws) {
		console.warn("Chat socket not connected");
		// returns empty function
		return () => {};
	}

	const previousHandler = ws.onmessage;
	userOnlineList.splice(0, userOnlineList.length, "Global Chat");

	ws.onmessage = (event) => {
		try {
			const msg: Message = JSON.parse(event.data);

			console.log("WS EVENT:", msg);

			switch(msg.type) {
				case "init": {
					chatHistory = msg.chatHistory;
					debugPrintGlobalHistory(chatHistory);
					console.log(`Init chatHistory for ${sockets.username}`)
					break;
				}
				case "broadcast": {
					if (activePrivateChat.current === null)
						renderIncomingMessage(msg, chatMessages);
					break;
				}
				case "direct": {
					if (activePrivateChat.current === msg.sender)
						renderIncomingMessage(msg, chatMessages);
					break;
				}
				case "onlineUser": {
					// Update onlineUserList in the frontend
					userOnlineList.splice(0, userOnlineList.length, ...populateUserOnlineList(msg, sockets.username));
					console.log(`OnlineUserList: ${userOnlineList}`);
					
					// build the chat
					renderOnlineUsers(friendList, 
						chatMessages, 
						chatHeader, 
						activePrivateChat, 
						userOnlineList, 
						chatHistory ?? {
							user: "",
							global: [],
							private: new Map(),
							tournament: []
						});
					break;
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
