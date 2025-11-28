import { blockedUsers, generalData, userData } from "../config/constants";
import { API_BASE } from "../config/endpoints";
import { populateChatWindow, populateOnlineUserList, renderBlockMessage, sendMessage, setupPrivateChathistory, wireIncomingChat } from "./chatHandler";
import { Message } from "./types";

export function updateBlockState(sender: string, target: string, type: "block" | "unblock") {
	if (!blockedUsers.has(sender)) {
		blockedUsers.set(sender, []);
	}

	const list = blockedUsers.get(sender)!;

	if (type === "block") {
		if (!list.includes(target)) {
			list.push(target);
		}
	}

	if (type === "unblock") {
		const index = list.indexOf(target);
		if (index !== -1) {
			list.splice(index, 1);
		}
	}
}


export function populatePrivateConv(username: string, privateMessages: Message[]): Map<string, Message[]> {
	const privateConvs = new Map<string, Message[]>();
	for (const msg of privateMessages) {
		const otherUser = msg.sender === username ? msg.receiver : msg.sender;
		
		if (!otherUser) continue;

		if (!privateConvs.has(otherUser)) {
			privateConvs.set(otherUser, []);
		}

		if (msg.type === "block" || msg.type === "unblock") {
			updateBlockState(msg.sender!, msg.receiver!, msg.type);
			continue;
		}

		const senderBlockedTarget =
			blockedUsers.get(msg.sender!)?.includes(msg.receiver!) ?? false;

		const targetBlockedSender =
			blockedUsers.get(msg.receiver!)?.includes(msg.sender!) ?? false;

		if (senderBlockedTarget || targetBlockedSender) {
			continue;
		}

		privateConvs.get(otherUser)!.push(msg);
	}

	return privateConvs;
}



export async function fetchUserData() {
	const response = await fetch(`${API_BASE}/api/user/data`, {
		credentials: "include",
	});
	if (!response.ok) {
		console.error("Failed to fetch user data, status:", response.status);
		return;
	}
	const body: any = await response.json();
	console.log("Raw user data response:", body);

	if (!body.success) {
		console.warn("Backend returned an error:", body.message);
		return;
	}
	const { chatHistory, friends, blockedUsers} = body.data;

	userData.chatHistory = {
		user: chatHistory.user,
		global: chatHistory.global,
		private: populatePrivateConv(chatHistory.user, chatHistory.private),
		tournament: chatHistory.tournament,
	};

	userData.blockedUsers = blockedUsers;
	userData.friends = friends;
}

export async function fetchAllUsers() {
	const response = await fetch(`${API_BASE}/api/users/all`, {
		credentials: "include",
	});
	if (!response.ok) {
		console.error("Failed to fetch all users, status:", response.status);
		return;
	}
	const body: any = await response.json();
	console.log("Raw all users response:", body);

	if (!body.success) {
		console.warn("Backend returned an error:", body.message);
		return;
	}

	generalData.allUsers = body.data;
}

export async function fetchOnlineUsers() {
	const response = await fetch(`${API_BASE}/api/users/online`, {
		credentials: "include",
	});
	if (!response.ok) {
		console.error("Failed to fetch online users, status:", response.status);
		return;
	}
	const body: any = await response.json();
	console.log("Raw online users response:", body);

	if (!body.success) {
		console.warn("Backend returned an error:", body.message);
		return;
	}

	generalData.onlineUsers = body.data;
}

export async function initChat(root: HTMLElement = document.body): Promise<() => void> {
	await fetchUserData();
	await fetchAllUsers();
	await fetchOnlineUsers();
	if (!userData.chatHistory) console.log("[CHAT] Error retrieving chat history");

	const onlineUserlist: string[] = ["Global Chat"];
	let activePrivateChat: { current: string | null } = { current: "Global Chat" };

	// LIVE CHAT /; ///////////////////////////////////////////////////////////////
	// MAIN CHAT PANEL (Container für Chat + Friends)
	const panel = document.createElement("div");
	panel.id = "chat-panel";
	panel.style.position = "fixed";
	panel.style.right = "20px";
	panel.style.bottom = "20px";
	panel.style.width = "520px";
	panel.style.display = "flex";
	panel.style.flexDirection = "row";

	panel.style.background = "rgba(10,10,10,0.85)";
	panel.style.backdropFilter = "blur(8px)";
	panel.style.border = "2px solid #00ffc8";
	panel.style.boxShadow = "0 0 10px #00ffc866, 0 0 20px #00ffc833";
	panel.style.borderRadius = "10px";

	panel.style.overflow = "hidden";
	panel.style.color = "#66ffc8";
	panel.style.fontFamily = "Orbitron, sans-serif";
	panel.style.zIndex = "9999";
	panel.style.transition = "height 0.25s ease, width 0.25s ease";
	let minimized = true;
	panel.style.height = minimized ? "40px" : "450px";

	// CHAT WINDOW - LEFT SIDE //////////////////////////////////////
	const chat = document.createElement("div");
	chat.style.flex = "1";
	chat.style.display = "flex";
	chat.style.flexDirection = "column";
	chat.style.padding = "10px";
	chat.style.borderRight = "1px solid rgba(0, 255, 200, 0.2)";
	panel.append(chat);

	// Chat Header
	const chatHeader = document.createElement("div");
	chatHeader.textContent = "Live Chat";
	chatHeader.style.fontWeight = "600";
	chatHeader.style.marginBottom = "8px";
	chatHeader.style.color = "#00ffc8";
    chatHeader.style.textShadow = "0 0 5px #66ffc8";
	chat.append(chatHeader);
	
	// Messages
	const chatMessages = document.createElement("div");
	chatMessages.style.flex = "1";
	chatMessages.style.overflowY = "auto";
	chatMessages.style.background = "rgba(0,0,0,0.4)";
	chatMessages.style.padding = "8px";
	chatMessages.style.borderRadius = "6px";
	chatMessages.style.border = "1px solid rgba(0, 255, 200, 0.1)";
	chat.append(chatMessages);

	// Input row
	const inputRow = document.createElement("div");
	inputRow.style.display = "flex";
	inputRow.style.gap = "6px";
	inputRow.style.marginTop = "10px";
	chat.append(inputRow);

	// Input
	const input = document.createElement("input");
	input.type = "text";
	input.placeholder = "Type a message…";
	input.style.flex = "1";
	input.style.border = "1px solid #00ffc8";
    input.style.background = "rgba(0,0,0,0.6)";
    input.style.color = "#66ffc8";
	input.style.padding = "6px 8px";
	input.style.borderRadius = "4px";
	input.style.border = "1px solid #444";
	inputRow.append(input);
	
	// Send button
	const sendBtn = document.createElement("button");
	sendBtn.textContent = "Send";
	
	sendBtn.style.background = "rgba(10,10,10,0.55)";
	sendBtn.style.color = "#66ffc8";
	sendBtn.style.border = "2px solid #00ffc8";
	sendBtn.style.padding = "6px 10px";
	sendBtn.style.borderRadius = "6px";
	sendBtn.style.fontWeight = "bold";
	sendBtn.style.cursor = "pointer";
	sendBtn.style.transition = "background-color 0.25s ease, box-shadow 0.25s ease, transform 0.12s ease";

	inputRow.append(sendBtn);

	// CHANNELS - RIGHT SIDE ///////////////////////////////////////////////////
	// CHANNEL LIST
	const friends = document.createElement("div");
	friends.style.width = "180px";
	friends.style.display = "flex";
	friends.style.flexDirection = "column";
	friends.style.background = "rgba(0,0,0,0.4)"; 
	friends.style.transition = "width 0.25s ease, padding 0.25s ease";
	panel.append(friends);

	// HEADER 
	const fHeader = document.createElement("div");
	fHeader.textContent = "Channels";
	fHeader.style.fontWeight = "bold";
	fHeader.style.fontSize = "18px";
	fHeader.style.margin = "8px";
	fHeader.style.cursor = "pointer";
	fHeader.style.whiteSpace = "nowrap";
	fHeader.style.color = "#00ffc8";
	fHeader.style.textShadow = "0 0 5px #66ffc8";
	friends.append(fHeader);

	// CHANNEL LIST CONTENT
	const channelList = document.createElement("div");
	channelList.style.flex = "1";
	channelList.style.overflowY = "auto";
	channelList.style.padding = "10px";
	friends.append(channelList);

	// ---- CAN GO -----
	// ONLINE USER LIST
	/*onlineUserlist.forEach((n) => {
		const item = document.createElement("div");
		item.textContent = n;
		item.style.padding = "6px 8px";
		item.style.marginBottom = "6px";
		
		item.style.background = "rgba(0, 255, 200, 0.1)";
		item.style.color = "#66ffc8";
		
		item.style.borderRadius = "4px";
		item.style.cursor = "pointer";
		
		item.onmouseenter = () => {
			item.style.backgroundColor = "rgba(0, 255, 200, 0.25)";
		};
		item.onmouseleave = () => {
			item.style.backgroundColor = "rgba(0, 255, 200, 0.1)";
		};
		
		channelList.append(item);
	});*/
	
	// CHAT EXPANDS AUTOMATICALLY
	chat.style.flex = "1";

	// TOGGLE OPEN/CLOSE FRIEND LIST
	let channelOpen = true;
	fHeader.onclick = () => {
		channelOpen = !channelOpen;
		if (channelOpen) {
			// NORMAL (aufgeklappt)
			friends.style.width = "180px";
			friends.style.padding = "6px";
			channelList.style.display = "block";
			
			fHeader.style.writingMode = "horizontal-tb";
			fHeader.style.margin = "8px";
			fHeader.style.rotate = "0deg";
			fHeader.textContent = "Channels";
		} else {

			friends.style.width = "32px";
			friends.style.padding = "0";
			channelList.style.display = "none";

			fHeader.style.writingMode = "vertical-lr";
			fHeader.style.rotate = "0deg";
			fHeader.style.margin = "40px auto 0 auto";
			fHeader.textContent = "Channels";
		}
	};

	// MINIMIZE CHAT
	// Minimize button
	const toggleBtn = document.createElement("div");
	toggleBtn.textContent = "–";
	toggleBtn.style.position = "absolute";
	toggleBtn.style.top = "5px";
	toggleBtn.style.right = "8px";
	toggleBtn.style.cursor = "pointer";
	toggleBtn.style.fontSize = "22px";
	toggleBtn.style.lineHeight = "22px";
	toggleBtn.style.fontWeight = "bold";
	toggleBtn.style.color = "#00ffc8";
	toggleBtn.style.textShadow = "0 0 5px #66ffc8"; // GLOW
	panel.append(toggleBtn);
	toggleBtn.onclick = () => {
		minimized = !minimized;
		panel.style.height = minimized ? "40px" : "450px";
		toggleBtn.textContent = minimized ? "+" : "–";
	};

	// EVENTS //////
	const cleanupWire = wireIncomingChat(chatMessages, channelList, chatHeader, activePrivateChat);

	// SEND MESSAGE ONE CLICK
	sendBtn.onclick = () => {

		sendBtn.style.transform = "scale(0.97)";
		setTimeout(() => sendBtn.style.transform = "scale(1)", 120);

		if (activePrivateChat.current === "Global Chat")
			sendMessage("broadcast", input.value);
		else {
			if (userData.blockedUsers?.includes(activePrivateChat.current!)) {
				console.log(`Message to ${activePrivateChat.current} should be blocked`);
				renderBlockMessage(activePrivateChat.current!, chatMessages);
			}
			else
				sendMessage("direct", input.value, activePrivateChat.current);
		}

		input.value = "";
	};

	// SEND MESSAGE BY PRESSING ENTER
	input.addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		e.preventDefault();

		sendBtn.style.transform = "scale(0.97)";
		setTimeout(() => sendBtn.style.transform = "scale(1)", 120);

		if (activePrivateChat.current === "Global Chat")
			sendMessage("broadcast", input.value);
		else {
			if (userData.blockedUsers?.includes(activePrivateChat.current!)) {
				console.log(`Message to ${activePrivateChat.current} should be blocked`);
				renderBlockMessage(activePrivateChat.current!, chatMessages);
			}
			else
				sendMessage("direct", input.value, activePrivateChat.current);
		}

		input.value = "";
	}
});
	// hover
	sendBtn.onmouseenter = () => {
		sendBtn.style.backgroundColor = "rgba(0, 255, 200, 0.15)";
		sendBtn.style.boxShadow = "0 0 14px #66ffc8, 0 0 22px #00ffc866";
	};
	sendBtn.onmouseleave = () => {
		sendBtn.style.backgroundColor = "rgba(10,10,10,0.55)";
		sendBtn.style.boxShadow = "none";
	};
	root.append(panel);

	return () => {
		cleanupWire?.();
		panel.remove();
	};
}
