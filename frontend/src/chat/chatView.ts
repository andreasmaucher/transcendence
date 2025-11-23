import { populateChatWindow, sendMessage, setupPrivateChathistory, wireIncomingChat } from "./chatHandler";

export function initChat(root: HTMLElement = document.body) : () => void {
	const onlineUserlist: string[] = [];
	let activePrivateChat: {current: string | null } = {current: null };

// LIVE CHAT /; ///////////////////////////////////////////////////////////////
// MAIN CHAT PANEL (Container für Chat + Friends)
	const panel = document.createElement("div");
	panel.id = "chat-panel";
	panel.style.position = "fixed";
	panel.style.right = "20px";
	panel.style.bottom = "20px";
	panel.style.width = "520px"; // Gesamtbreite
	panel.style.height = "450px";
	panel.style.display = "flex";
	panel.style.flexDirection = "row";
	panel.style.background = "rgba(0,0,0,0.75)";
	panel.style.border = "1px solid #777";
	panel.style.borderRadius = "10px";
	panel.style.overflow = "hidden";
	panel.style.color = "white";
	panel.style.zIndex = "9999";
	panel.style.transition = "height 0.25s ease, width 0.25s ease";
	//root.append(panel);
	// CHAT WINDOW - LEFT SIDE //////////////////////////////////////
	const chat = document.createElement("div");
	chat.style.flex = "1"; // nimmt linken Platz ein
	chat.style.display = "flex";
	chat.style.flexDirection = "column";
	chat.style.padding = "10px";
	panel.append(chat);
	// Chat Header
	const chatHeader = document.createElement("div");
	chatHeader.textContent = "Live Chat";
	chatHeader.style.fontWeight = "600";
	chatHeader.style.marginBottom = "8px";
	chat.append(chatHeader);
	// Messages
	const chatMessages = document.createElement("div");
	chatMessages.style.flex = "1";
	chatMessages.style.overflowY = "auto";
	chatMessages.style.background = "rgba(255,255,255,0.05)";
	chatMessages.style.padding = "8px";
	chatMessages.style.borderRadius = "6px";
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
	input.style.borderRadius = "4px";
	input.style.border = "1px solid #444";
	inputRow.append(input);
	// Send button
	const sendBtn = document.createElement("button");
	sendBtn.textContent = "Send";
	sendBtn.style.background = "#2563EB";
	sendBtn.style.color = "white";
	sendBtn.style.border = "none";
	sendBtn.style.padding = "6px 10px";
	sendBtn.style.borderRadius = "4px";
	sendBtn.style.cursor = "pointer";
	inputRow.append(sendBtn);

	// FRIENDS - RIGHT SIDE ///////////////////////////////////////////////////////
	// FRIEND LIST (rechte Spalte)
	const friends = document.createElement("div");
	friends.style.width = "180px";
	friends.style.display = "flex";
	friends.style.flexDirection = "column";
	friends.style.background = "rgba(255,255,255,0.05)";
	friends.style.borderLeft = "1px solid #666";
	friends.style.transition = "width 0.25s ease, padding 0.25s ease";
	panel.append(friends);
	// HEADER (bleibt immer sichtbar)
	const fHeader = document.createElement("div");
	fHeader.textContent = "Friends";
	fHeader.style.fontWeight = "600";
	fHeader.style.margin = "8px";
	fHeader.style.cursor = "pointer";
	fHeader.style.whiteSpace = "nowrap";
	friends.append(fHeader);
	// FRIEND LIST CONTENT
	const friendList = document.createElement("div");
	friendList.style.flex = "1";
	friendList.style.overflowY = "auto";
	friendList.style.padding = "10px";
	friends.append(friendList);

	// EXAMPLE FRIENDS
	onlineUserlist.forEach((n) => {
	const item = document.createElement("div");
	item.textContent = n;
	item.style.padding = "6px 8px";
	item.style.marginBottom = "6px";
	item.style.background = "rgba(255,255,255,0.08)";
	item.style.borderRadius = "4px";
	item.style.cursor = "pointer";
	friendList.append(item);
	});
	// CHAT EXPANDS AUTOMATICALLY
	chat.style.flex = "1";
	// TOGGLE OPEN/CLOSE FRIEND LIST
	let friendsOpen = true;
	fHeader.onclick = () => {
	friendsOpen = !friendsOpen;
	if (friendsOpen) {
		// NORMAL (aufgeklappt)
		friends.style.width = "180px";
		friends.style.padding = "6px";
		friendList.style.display = "block";
		// Header horizontal
		fHeader.style.writingMode = "horizontal-tb";
		fHeader.style.margin = "6px";
		fHeader.style.rotate = "0deg";
		fHeader.textContent = "Friends";
	} else {
		// EINGEKLAPPT — nur schmale Leiste sichtbar
		friends.style.width = "32px"; // genug Platz für vertikale Schrift
		friends.style.padding = "0";
		friendList.style.display = "none";
		// Header senkrecht von oben nach unten
		fHeader.style.writingMode = "vertical-lr"; // von oben nach unten
		fHeader.style.rotate = "0deg"; // keine Drehung!
		fHeader.style.margin = "40px auto 0 auto"; // VERSATZT unter Minimize-Button
		fHeader.textContent = "Friends";
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
	panel.append(toggleBtn);
	let minimized = false;
	toggleBtn.onclick = () => {
	minimized = !minimized;
	panel.style.height = minimized ? "40px" : "450px";
	};


	// EVENTS //////
	const cleanupWire = wireIncomingChat(
		chatMessages, 
		friendList, 
		chatHeader, 
		activePrivateChat, 
		onlineUserlist);
	//populateChatWindow({ user: "", global: [], private: new Map(), tournament: [] }, chatMessages);

	// SEND MESSAGE
	sendBtn.onclick = () => {
		if (activePrivateChat.current === null)
			sendMessage("broadcast", input.value);
		else
			sendMessage("direct", input.value, activePrivateChat.current);
	}

	root.append(panel);

	return () => {
		cleanupWire?.();
		panel.remove();
	};
}