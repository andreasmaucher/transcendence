import { generalData, userData } from "../config/constants";
import { ChatEvent, chatHistory, Message } from "./types";
import { navigate } from "../router/router"; 


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
	item.style.background = "rgba(0, 255, 200, 0.1)";
	item.style.borderRadius = "4px";
	item.style.cursor = "pointer";

	if (message.type === "blockedByMeMessage") {
		item.style.background = "rgba(150, 0, 0, 0.4)";
		item.innerHTML =
			`<span style="color: #ff0000; font-weight: bold;">You've blocked ${message.receiver}. No Conversation possible!</span>`;
	}
	else if (message.type === "blockedByOthersMessage"){
		item.style.background = "rgba(255, 170, 0, 0.15)";
		item.innerHTML =
			`<span style="color: #ffaa00; font-weight: bold;">You have been blocked by ${message.receiver}. Message cannot be sent.</span>`;
	} else {
		item.innerHTML = `
			<div style="display:flex; justify-content:space-between; font-size:12px; color: #00ffc8;">
				<strong>${message.sender}</strong>
				<small style="color: #66ffc8;">${message.sentAt}</small>
			</div>
			<span style="color: #66ffc8;">${message.content}</span>
			`;
	}

	chatMessages.append(item);
	requestAnimationFrame(() => {
		chatMessages.scrollTop = chatMessages.scrollHeight;
	});
}

export function renderBlockMessage(blockedUser: string, chatMessages: HTMLElement) {
	const item = document.createElement("div");
	item.className = "chat-message";
	item.style.padding = "6px 8px";
	item.style.marginBottom = "6px";
	item.style.background = "rgba(150, 0, 0, 0.4)";
	item.style.borderRadius = "4px";
	item.style.cursor = "pointer";

	item.innerHTML =
	`<span style="color: #ff0000; font-weight: bold;">You've blocked ${blockedUser}. No Conversation possible!</span>`;

	chatMessages.append(item);
	requestAnimationFrame(() => {
		chatMessages.scrollTop = chatMessages.scrollHeight;
	});
}

export function renderBlockedByMessage(blockedByUser: string, chatMessages: HTMLElement) {
	const item = document.createElement("div");
	item.className = "chat-message";
	item.style.padding = "6px 8px";
	item.style.marginBottom = "6px";
	item.style.background = "rgba(255, 170, 0, 0.15)";
	item.style.borderRadius = "4px";
	item.style.cursor = "pointer";

	item.innerHTML =
	`<span style="color: #ffaa00; font-weight: bold;">You have been blocked by ${blockedByUser}. Message cannot be sent.</span>`;

	chatMessages.append(item);
	requestAnimationFrame(() => {
		chatMessages.scrollTop = chatMessages.scrollHeight;
	});
}

async function fetchOpenGames() {
	try {
		const response = await fetch("/api/games/open");

		if (response.status !== 200 && response.status !== 404) {
			const errorText = await response.text(); 
			console.error("Server returned non-OK status. Response:", errorText);
			throw new Error(`Server error: Status ${response.status}`);
		}
		if (response.status === 404) {
			return { singleGames: [], tournaments: [] };
		}
		if(!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = await response.json();
		return result.data;
	} catch (error) {
		console.error("Error fetching open games:", error);
		return { singleGames: [], tournaments: [] };
	}
}

export function removeModal() {
	const existingModal = document.getElementById('challenge-modal-overlay');
	if (existingModal) {
		existingModal.remove();
	}
}

async function handleDuelChallenge() {
		removeModal();

		const openGames = await fetchOpenGames();

		const availableGames = [];

		const singleGames = openGames.openSingleGames || [];

		openGames.singleGames.forEach(g => {
			availableGames.push({
				type: 'single', 
				id: g.id, 
				creator: g.creator,
				name: `Single Game #${g.gameNumber} (created by: ${g.creator})` 
			});
		});

		const tournaments = openGames.openTournaments || {};

		if (tournaments && typeof tournaments === 'object') {
				Object.entries(tournaments).forEach(([id, t]) => {
					// 'id' ist der Schlüssel, 't' ist das Turnier-Datenobjekt
					if (t.name) { // Sicherheitsprüfung
						availableGames.push({   
							type: 'tournament', 
							id: id, // <--- Die ID ist jetzt der SCHLÜSSEL
							name: `Tournament: ${t.name}` // <--- Der Name ist in den Turnierdaten
						});
					}
				});
			}

		if (availableGames.length === 0) {
			alert(`No open games or tournaments available to challenge ${userData.activePrivateChat}`);
			return;
		}

		console.log(`Open Single Games: `, openGames.openSingleGames);
		console.log(`Open Tournaments: `, openGames.openTournaments);

		const modalOverlay = document.createElement('div');
		modalOverlay.id = 'challenge-modal-overlay';
		modalOverlay.style.cssText = `
		position: fixed; top: 0; left: 0; width: 100%; height: 100%;
		background-color: rgba(0, 0, 0, 0.75); z-index: 1000;
		display: flex; justify-content: center; align-items: center;
		`;
		//close by clicking outside of the modal
		modalOverlay.onclick = removeModal;

		const modalContent = document.createElement('div');
		modalContent.style.cssText = `
		background: #111; padding: 20px; border-radius: 8px;
		border: 1px solid #00ffc8; box-shadow: 0 0 10px #00ffc8;
		max-width: 400px; width: 90%; color: #fff;
		`;
		// prevents the closing of the modal by clicking somewhere inside the modal
		modalContent.onclick = (e) => e.stopPropagation();

		const header = document.createElement('h3');
		header.textContent = `Choose a match/tournament for ${userData.activePrivateChat}` //DE: `Wähle eine Herausforderung für ${targetUser}`;
		header.style.color = '#00ffc8';
		modalContent.appendChild(header);

		const listContainer = document.createElement('ul');
		listContainer.style.cssText = `
			list-style: none; padding: 0; max-height: 250px; overflow-y: auto;
		`;

		availableGames.forEach(game => {
			const listItem = document.createElement('li');
			listItem.textContent = `[${game.type.toUpperCase()}] ${game.name}`;
			listItem.style.cssText = `
				padding: 10px; margin-bottom: 5px; cursor: pointer;
				background: rgba(0, 224, 179, 0.1); border-radius: 4px;
			`;
			
			// hover
			listItem.onmouseenter = () => listItem.style.background = 'rgba(0, 255, 200, 0.35)';
			listItem.onmouseleave = () => listItem.style.background = 'rgba(0, 224, 179, 0.1)';

			// send invitation
			listItem.onclick = () => {
				sendMessage('invite', 'I\'ll crush you', userData.activePrivateChat, game.id);
				console.log(`[WS] Sending challenge to ${userData.activePrivateChat} for game: ${game.id}`);
				//sendChallengeInvite(targetUser, game.type, game.id, game.name);
				removeModal(); // Schließe das Modal nach dem Senden
			};
			
			listContainer.appendChild(listItem);
		});

	modalContent.appendChild(listContainer);
	modalOverlay.appendChild(modalContent);
	document.body.appendChild(modalOverlay);
}

export function renderChatHeaderButtons(
	chatHeader: HTMLElement,
	activeChat: string | null
) {
	chatHeader.innerHTML = "";

	const primaryNeon = "#00ffc8"; // OLD "#00e0b3";
	const secondaryNeon = "#66ffc8"; // OLD "#33cc99";

	const title = document.createElement("span");
	title.textContent =
		activeChat === "Global Chat"
			? "Global Chat"
			: `Chat with ${activeChat}`;

	title.style.flex = "1";
	title.style.fontWeight = "600";
	title.style.color = primaryNeon
	title.style.textShadow = `0 0 5px ${secondaryNeon}`

	chatHeader.style.display = "flex";
	chatHeader.style.alignItems = "flex-start"; 
	chatHeader.style.justifyContent = "space-between";
	chatHeader.style.paddingTop = "0px";
	chatHeader.style.paddingBottom = "0px";
	chatHeader.style.marginBottom = "8px";

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
		btn.style.cursor = "pointer";
		btn.style.transition = "background-color 0.2s ease, box-shadow 0.2s ease"; // hover

		btn.style.color = blocked ? "white" : secondaryNeon
		btn.style.border = `1px solid ${primaryNeon}`
		btn.style.background = blocked 
		? "rgba(150, 0, 0, 0.58)"
		: "rgba(0, 224, 179, 0.08)";

		btn.style.cursor = "pointer";
		btn.onclick = (e) => {
			e.stopPropagation();
			action();
		};

		const hoverColor = blocked ? "rgba(255, 0, 0, 0.8)" : "rgba(0, 255, 200, 0.35)";
		const boxShadowColor = blocked ? "rgba(255, 0, 0, 0.8)" : secondaryNeon;

		// hover
		btn.onmouseenter = () => {
			btn.style.backgroundColor = hoverColor;
			btn.style.boxShadow = `0 0 6px ${boxShadowColor}`;
			// icon glow
			if (!blocked) {
				btn.style.textShadow = `0 0 5px ${secondaryNeon}`;
			}
		};
		btn.onmouseleave = () => {
			btn.style.backgroundColor = blocked 
			? "rgba(150, 0, 0, 0.58)" 
			: "rgba(0, 224, 179, 0.08)";
			btn.style.boxShadow = "none";

			// text glow
			if (!blocked) {
				btn.style.textShadow = "none";
			}
		};

		return btn;
	};

	// navigates to the profile of the other user :)
	const btnProfile = createIconBtn("👤", "Open profile", () => {
		navigate(`#/user/${activeChat}`);
	});

	const btnDuel = createIconBtn("⚔️", "Challenge to match", () => {
		//console.log(`⚔️ Challenge sent to ${activeChat}`);
		handleDuelChallenge();
	});

	const isBlocked = userData.blockedUsers?.includes(activeChat!);
	
	const btnBlock = createIconBtn(
		isBlocked? "♻️": "🚫",
		isBlocked? "Unblock user" : "Block user",
		() => {
			const isBlockedNow = userData.blockedUsers?.includes(activeChat!) || false;

			if (!isBlockedNow){
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
	channelListContainer: HTMLElement,
	chatMessages: HTMLElement,
	chatHeader: HTMLElement,
) {
	channelListContainer.innerHTML = "";

	const primaryNeon = "#00ffc8";
	const secondaryNeon = "#66ffc8"
	const headerGreen = "#00A358"

	const allUsersExcludingSelfAndGlobal = generalData.onlineUsers!.filter(
		u => u !== userData.username && u !== "Global Chat"
	);

	const friendsOnline = allUsersExcludingSelfAndGlobal.filter(u => userData.friends?.includes(u));
	const othersOnline = allUsersExcludingSelfAndGlobal.filter(u => !userData.friends?.includes(u));
	const friendsOffline = userData.friends.filter(f => !allUsersExcludingSelfAndGlobal.includes(f));

	const renderSectionHeader = (title: string, color: string, margin: string = "12px 0 5px 0") => {
		const header = document.createElement("h4");
		header.textContent = title;
		header.style.color = color;
		header.style.margin = margin;
		header.style.fontSize = "14px";
		header.style.paddingLeft = "4px";
		header.style.borderBottom = `1px solid rgba(0, 255, 200, 0.1)`;
		channelListContainer.append(header);
	};

	const renderUserItem = (username: string, isOffline: boolean = false) => {
		const userItem = document.createElement("div");
		userItem.textContent = username;
		userItem.style.padding = "6px 8px";
		userItem.style.marginBottom = "6px";
		userItem.style.borderRadius = "4px";
		userItem.style.cursor = "pointer";
		userItem.classList.add("online-user");

		if (isOffline) {
			userItem.style.background = "rgba(255, 255, 255, 0.05)"; 
			userItem.style.color = "#888"; 
		} else if (username !== "Global Chat") {
			userItem.style.background = "rgba(0, 255, 200, 0.1)"; 
			userItem.style.color = "#66ffc8";
		} else {
			userItem.style.background = "rgba(0, 255, 200, 0.2)";
			userItem.style.color = primaryNeon;
			userItem.style.fontWeight = "bold";
		}

		// highlight active channel
		if (username === userData.activePrivateChat) {
			userItem.style.border = `1px solid ${primaryNeon}`
			userItem.style.boxShadow = `0 0 5px ${primaryNeon}`
			userItem.style.color = primaryNeon; // Stärkeres Neon für aktiv
		}
		
		// hover
		userItem.onmouseenter = () => {
			userItem.style.backgroundColor = isOffline 
				? "rgba(255, 255, 255, 0.1)" 
				: "rgba(0, 255, 200, 0.25)";
		};
		userItem.onmouseleave = () => {
			userItem.style.backgroundColor = (username === userData.activePrivateChat) 
				? `rgba(0, 255, 200, 0.1)` 
				: isOffline ? "rgba(255, 255, 255, 0.05)" : `rgba(0, 255, 200, 0.1)`;
		};

		// Click handler
		userItem.onclick = () => {
			userData.activePrivateChat = username;
			localStorage.setItem('activePrivateChat', username);
			renderOnlineUsers(channelListContainer, chatMessages, chatHeader); 
			chatMessages.innerHTML = "";
			populateChatWindow(userData.chatHistory!, chatMessages); 
			renderChatHeaderButtons(chatHeader, userData.activePrivateChat);
		};
		channelListContainer.append(userItem);
	};

	//render the sections
	renderUserItem("Global Chat");

	//friends online
	if (friendsOnline.length > 0 || friendsOffline.length > 0) {
		renderSectionHeader("Friends", headerGreen);
		friendsOnline.forEach(f => renderUserItem(f, false));
		friendsOffline.forEach(f => renderUserItem(f, true));
	}

	//user online
	if (othersOnline.length > 0) {
		renderSectionHeader("Online Users", headerGreen);
		othersOnline.forEach(f => renderUserItem(f, false));
	}
}

// METHODS /////////////////////////////////////////////////////////////////////

export function setupPrivateChathistory(username: string): Message[] {
	if (!userData.chatHistory!.private.has(username)) {
		userData.chatHistory!.private.set(username, []);
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

export function removeUserFromList(username: string, list: string[] | null): string[] {
	if (!list) return [];

	return list.filter(
		(user) => user !== username
	);
}

export function addUserToList(userToBlock: string, list: string[] | null): string[] {
	if (!list)
		list = [];
	if (!list.includes(userToBlock))
		list.push(userToBlock);
	return list
}

export function populateChatWindow(
	chatHistory: chatHistory,
	chatMessages: HTMLElement,
) {
	chatMessages.innerHTML = "";

	let chatHistoryToAdd: Message[] = [];
	const activeChat = userData.activePrivateChat;

	if (activeChat === "Global Chat") {
		chatHistoryToAdd = chatHistory.global;
		//console.log("GlobalChatHistory should be loaded!");
	} else {
		//console.log(`private chatHistory for ${activePrivateChat.current} loaded!`);
		chatHistoryToAdd = setupPrivateChathistory(activeChat!);
	}
	chatHistoryToAdd.forEach((message) => {
		renderIncomingMessage(message, chatMessages);
	});
}

export function appendMessageToHistory(message: Message): void {
	if (message.type === "broadcast") {
		userData.chatHistory!.global.push(message);
		return;
	}
	if (message.type === "direct" || 
		(message.type === "blockedByMeMessage" && message.sender === userData.username) || 
		(message.type === "blockedByOthersMessage" && message.sender === userData.username)) {
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

export function wireIncomingChat(
	chatMessages: HTMLElement,
	friendList: HTMLElement,
	chatHeader: HTMLElement,
): () => void {
	const ws = userData.userSock;
	if (!ws) {
		console.warn("Chat socket not connected");
		return () => {};
	}

	const previousHandler = ws.onmessage;

	const savedChatPartner = localStorage.getItem('activeChatPartner');
	if (savedChatPartner) {
		userData.activePrivateChat = savedChatPartner;
	} else if (!userData.activePrivateChat){
		userData.activePrivateChat = "Global Chat";
	}


	generalData.onlineUsers = populateOnlineUserList(userData.username);
	populateChatWindow(userData.chatHistory!, chatMessages);
	renderOnlineUsers(friendList, chatMessages, chatHeader);
	renderChatHeaderButtons(chatHeader, userData.activePrivateChat);

	ws.onmessage = (event) => {
		try {
			
			const payload = JSON.parse(event.data);
			if (payload && payload.type === "chat") {
				const msg: Message = payload.data;
				console.log("WS EVENT:", msg);

				switch (msg.type) {
					case "broadcast": {
						if (userData.activePrivateChat === "Global Chat")
							renderIncomingMessage(msg, chatMessages);
						appendMessageToHistory(msg);
						break;
					}
					case "direct": {
						if ((userData.activePrivateChat === msg.sender || userData.activePrivateChat === msg.receiver)
						&& (!userData.blockedUsers?.includes(msg.sender) && !userData.blockedByUsers?.includes(msg.receiver!)))
							renderIncomingMessage(msg, chatMessages);
						appendMessageToHistory(msg);
						break;
					}
					case "block": {
						if (msg.receiver === userData.username) {
							userData.blockedByUsers = addUserToList(msg.sender, userData.blockedByUsers);
						}
						appendMessageToHistory(msg);
						break;
						}
					case "unblock": {
						if (msg.receiver === userData.username) {
							userData.blockedByUsers = removeUserFromList(msg.sender, userData.blockedByUsers);
						}
						appendMessageToHistory(msg);
						break;
					}
					case "blockedByMeMessage": {
						if (userData.activePrivateChat === msg.receiver) {
								console.log(`blockedByMeMessage from ${msg.sender} for ${msg.receiver}`);
								renderIncomingMessage(msg, chatMessages);
						}
						appendMessageToHistory(msg);
						break;
						}
					case "blockedByOthersMessage": {
						if (userData.activePrivateChat === msg.receiver){
								console.log(`blockedByOthersMessage from ${msg.sender} for ${msg.receiver}`);
								renderIncomingMessage(msg, chatMessages);
							}
						appendMessageToHistory(msg);
						break;
						}
				}
			}

			if (payload && payload.type === "user-online") {
				const newUserOnline = payload.data.username;
				console.log(`${newUserOnline} entered the realm!`)
				addOnlineUser(newUserOnline);
				renderOnlineUsers(
							friendList,
							chatMessages,
							chatHeader
						);
					}

			if (payload && payload.type === "user-offline") {
				const newUserOffline = payload.data.username;
				console.log(`${newUserOffline} left the realm!`)
				generalData.onlineUsers = removeUserFromList(newUserOffline, generalData.onlineUsers!);
				renderOnlineUsers(
							friendList,
							chatMessages,
							chatHeader
						);
					}

			if (payload && payload.type == "block") {
				const blockedUser = payload.data.username;
				console.log(`${userData.username} blocked ${blockedUser}`)
				userData.blockedUsers = addUserToList(blockedUser, userData.blockedUsers);
				renderOnlineUsers(
							friendList,
							chatMessages,
							chatHeader
						);
					}

				if (payload && payload.type == "unblock") {
				const unblockedUser = payload.data.username;
				console.log(`${userData.username} unblocked ${unblockedUser}`)
				userData.blockedUsers = removeUserFromList(unblockedUser, userData.blockedUsers!);
				renderOnlineUsers(
							friendList,
							chatMessages,
							chatHeader
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
