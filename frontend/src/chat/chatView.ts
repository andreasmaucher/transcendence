import { generalData, userData } from "../config/constants";
import { API_BASE } from "../config/endpoints";
import { renderBlockMessage, sendMessage, wireIncomingChat } from "./chatHandler";
import { Message } from "./types";

export function updateLocalBlockState(
	blockedUserMap: Map<string, string[]>,
	sender: string,
	target: string,
	type: "block" | "unblock"
) {
	if (!blockedUserMap.has(sender)) {
		blockedUserMap.set(sender, []);
	}

	const list = blockedUserMap.get(sender)!;

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
	const blockedUsersLocal = new Map<string, string[]>();
	let blockedByMe: string[] = [];
	let blockedByThem: string[] = [];

	for (const msg of privateMessages) {
		const otherUser = msg.sender === username ? msg.receiver : msg.sender;

		if (!otherUser) continue;

		if (!privateConvs.has(otherUser)) {
			privateConvs.set(otherUser, []);
		}

		if (msg.type === "block" || msg.type === "unblock") {
			updateLocalBlockState(blockedUsersLocal, msg.sender!, msg.receiver!, msg.type);
			
			if (msg.sender === username){
				const index = blockedByThem.indexOf(msg.receiver!);
				if (msg.type === "block") {
					if (index === -1) blockedByThem.push(msg.receiver!);
				} else {
					if (index !== -1) blockedByThem.splice(index, 1);
				}
			} else if (msg.receiver === username) {
				const index = blockedByMe.indexOf(msg.sender!);
				if (msg.type === "block") {
					if (index === -1) blockedByMe.push(msg.sender!);
				} else {
					if (index !== -1) blockedByMe.splice(index, 1);
				}
			}
			continue;
		}

		const senderBlockedTarget =
			blockedUsersLocal.get(msg.sender!)?.includes(msg.receiver!) ?? false;

		const targetBlockedSender =
			blockedUsersLocal.get(msg.receiver!)?.includes(msg.sender!) ?? false;

		if ((msg.type === "blockedByMeMessage" || msg.type === "blockedByOthersMessage") && msg.sender === userData.username)
			privateConvs.get(otherUser)!.push(msg);

		if (senderBlockedTarget || targetBlockedSender) {
			continue;
		}

		privateConvs.get(otherUser)!.push(msg);
	}

	userData.blockedByUsers = blockedByThem;
	userData.blockedUsers = blockedByMe;
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

	if (!body.success) {
		console.warn("Backend returned an error:", body.message);
		return;
	}
	const { blockedByUsers, blockedUsers, chatHistory, friends} = body.data;

	userData.blockedByUsers = blockedByUsers ?? [];
	userData.blockedUsers = blockedUsers ?? [];

	userData.chatHistory = {
		user: chatHistory.user,
		global: chatHistory.global,
		private: await populatePrivateConv(chatHistory.user, chatHistory.private),
		tournament: chatHistory.tournament,
	};

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
	if (!userData.chatHistory || !userData.blockedUsers || !userData.friends)
		console.log("[CHAT] Error retrieving user data");

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
	chatHeader.textContent = "Global Chat";
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

	// CHAT EXPANDS AUTOMATICALLY
	chat.style.flex = "1";

	// STATIC CHANNELLIST
	friends.style.width = "180px";
	friends.style.padding = "6px";
	channelList.style.display = "block";

	fHeader.style.writingMode = "horizontal-tb";
	fHeader.style.margin = "8px";
	fHeader.style.rotate = "0deg";
	fHeader.textContent = "Channels";

	// MINIMIZE CHAT
	// Minimize button
	const toggleBtn = document.createElement("div");
	toggleBtn.textContent = "+";
	toggleBtn.style.position = "absolute";
	toggleBtn.style.top = "5px"
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
	const cleanupWire = wireIncomingChat(chatMessages, channelList, chatHeader);

	// SEND MESSAGE ON CLICK
	sendBtn.onclick = () => {

		sendBtn.style.transform = "scale(0.97)";
		setTimeout(() => sendBtn.style.transform = "scale(1)", 120);

		if (userData.activePrivateChat === "Global Chat")
			sendMessage("broadcast", input.value);
		else {
			if (userData.blockedUsers?.includes(userData.activePrivateChat!)) {
				console.log(`Message to ${userData.activePrivateChat} should be blocked`);
				sendMessage("blockedByMeMessage", '', userData.activePrivateChat);
			} else if (userData.blockedByUsers?.includes(userData.activePrivateChat!)) {
				console.log(`${userData.activePrivateChat} blocked you`);
				sendMessage("blockedByOthersMessage", '', userData.activePrivateChat);
			}
			else
				sendMessage("direct", input.value, userData.activePrivateChat);
		}

		input.value = "";
	};

	// SEND MESSAGE BY PRESSING ENTER
	input.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			e.preventDefault();

		sendBtn.style.transform = "scale(0.97)";
		setTimeout(() => sendBtn.style.transform = "scale(1)", 120);

		if (userData.activePrivateChat === "Global Chat")
			sendMessage("broadcast", input.value);
		else {
			if (userData.blockedUsers?.includes(userData.activePrivateChat!)) {
				console.log(`Message to ${userData.activePrivateChat} should be blocked`);
				sendMessage("blockedByMeMessage", '', userData.activePrivateChat);
			} else if (userData.blockedByUsers?.includes(userData.activePrivateChat!)) {
				console.log(`${userData.activePrivateChat} blocked you`);
				sendMessage("blockedByOthersMessage", '', userData.activePrivateChat);
			}
			else
				sendMessage("direct", input.value, userData.activePrivateChat);
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
