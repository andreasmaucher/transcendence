import { generalData, userData } from "../config/constants";
import {
	ApiOpenSingleGame,
	ApiOpenTournament,
	ChatEvent,
	chatHistory,
	Message,
	OpenGames,
	OpenGamesResponse,
} from "./types";
import { navigate } from "../router/router";
import { API_BASE } from "../config/endpoints";
import { convertUTCStringToLocal } from "../utils/time";

export function sendMessage(
	type: ChatEvent,
	content: string,
	receiver: string | null = null,
	gameId: any | null = null,
	tournamentName: string | null = null
) {
	const message: Message = {
		id: undefined,
		sender: userData.username!,
		receiver: receiver ?? undefined,
		type: type,
		content: content,
		gameId: gameId ?? undefined,
		sentAt: undefined,
		tournamentName: tournamentName ?? undefined,
	};
	if (userData.userSock?.readyState === WebSocket.OPEN) {
		userData.userSock.send(JSON.stringify(message));
		console.log(`Message sent ${message.type}`);
	}
}

// RENDER FUNCTIONS ///////////////////////////////////////////////////////////

export async function renderIncomingMessage(message: Message) {
	const messageElement = document.createElement("div");

	messageElement.classList.add("message", "chat-message");
	messageElement.style.padding = "6px 8px";
	messageElement.style.marginBottom = "6px";
	messageElement.style.background = "rgba(0, 255, 200, 0.1)";
	messageElement.style.borderRadius = "4px";
	messageElement.style.cursor = "pointer";

	const createHeader = (senderName: string, timeStr: string | undefined) => {
		const headerContainer = document.createElement("div");
		headerContainer.style.display = "flex";
		headerContainer.style.justifyContent = "space-between";
		headerContainer.style.fontSize = "12px";
		headerContainer.style.color = "#00ffc8";
		headerContainer.style.marginBottom = "5px";

		const senderStrong = document.createElement("strong");
		senderStrong.textContent = senderName;

		const timeSmall = document.createElement("small");
		timeSmall.style.color = "#66ffc8";
		timeSmall.textContent = timeStr || "";

		headerContainer.appendChild(senderStrong);
		headerContainer.appendChild(timeSmall);
		return headerContainer;
	};

	if (message.type === "blockedByMeMessage") {
		messageElement.style.background = "rgba(150, 0, 0, 0.4)";

		const span = document.createElement("span");
		span.style.color = "#ff0000";
		span.style.fontWeight = "bold";
		span.textContent = `You've blocked ${message.receiver}. No Conversation possible!`;

		messageElement.appendChild(span);
	} else if (message.type === "blockedByOthersMessage") {
		messageElement.style.background = "rgba(255, 170, 0, 0.15)";

		const span = document.createElement("span");
		span.style.color = "#ffaa00";
		span.style.fontWeight = "bold";
		span.textContent = `You have been blocked by ${message.receiver}. Message cannot be sent.`;

		messageElement.appendChild(span);
	} else if (message.type === "invite") {
		const isGameStillAvailable = await isGameStillOpen(message.gameId!);
		const isExpired = !isGameStillAvailable;

		if (isExpired) {
			const expiredText = document.createElement("div");
			expiredText.style.color = "#888";
			expiredText.style.fontStyle = "italic";
			expiredText.textContent = `⚔️ Game Invite from ${message.sender} (Expired)`;
			messageElement.appendChild(expiredText);
		} else {
			messageElement.appendChild(createHeader(message.sender, convertUTCStringToLocal(message.sentAt!)));

			const inviteContainer = document.createElement("div");
			inviteContainer.style.background = "rgba(0, 0, 0, 0.3)";
			inviteContainer.style.border = "1px solid #00ffc8";
			inviteContainer.style.padding = "10px";
			inviteContainer.style.borderRadius = "5px";

			const text = document.createElement("p");
			text.textContent = message.content || "";
			text.style.color = "#fff";
			text.style.margin = "0 0 5px 0";

			const joinButton = document.createElement("button");
			joinButton.textContent = "ACCEPT CHALLENGE";
			joinButton.style.cursor = "pointer";
			joinButton.style.backgroundColor = "#00ffc8";
			joinButton.style.color = "#000";
			joinButton.style.border = "none";
			joinButton.style.padding = "5px 10px";
			joinButton.style.borderRadius = "3px";
			joinButton.style.fontWeight = "bold";

			joinButton.onclick = (e) => {
				e.stopPropagation();
				if (message.content === "Are you up for a tournament") {
					navigate(
						`#/game?mode=tournament&id=${message.gameId}&name=${encodeURIComponent(message.tournamentName!)}`
					);
				} else {
					navigate(`#/game?mode=online&id=${message.gameId}`);
				}
				console.log("Joining game:", message.gameId);
			};

			inviteContainer.appendChild(text);
			inviteContainer.appendChild(joinButton);
			messageElement.appendChild(inviteContainer);
		}
	} else {
		messageElement.appendChild(createHeader(message.sender, convertUTCStringToLocal(message.sentAt!)));

		const contentSpan = document.createElement("span");
		contentSpan.style.color = "#66ffc8";
		contentSpan.textContent = message.content || "";

		messageElement.appendChild(contentSpan);
	}

	return messageElement;
}

export async function displayIncomingMessage(msg: Message, chatMessages: HTMLElement) {
	const messageElement = await renderIncomingMessage(msg);
	chatMessages.append(messageElement);
	requestAnimationFrame(() => {
		chatMessages.scrollTop = chatMessages.scrollHeight;
	});
}

export async function isGameStillOpen(gameId: string): Promise<boolean> {
	if (!gameId) {
		console.warn("isGameStillOpen: gameId ist null/undefined.");
		return false;
	}

	try {
		const openGamesData = await fetchOpenGames();

		const singleGames = openGamesData.openSingleGames || [];
		const tournaments = openGamesData.openTournaments || [];

		const isSingleGameOpen = singleGames.some((g: ApiOpenSingleGame) => {
			return g.id === gameId && g.match.isRunning === false && g.playersJoined < 2;
		});

		if (isSingleGameOpen) {
			return true;
		}

		const isTournamentOpen = tournaments.some((t: ApiOpenTournament) => {
			return t.id === gameId && t.state.isRunning === false && t.playersJoined < t.state.size;
		});

		return isTournamentOpen;
	} catch (error) {
		console.error("Error while checking for openGames: ", error);
		return false;
	}
}

async function fetchOpenGames() {
	try {
		const response = await fetch(`${API_BASE}/api/games/open`, {
			credentials: "include",
		});

		if (response.status !== 200 && response.status !== 404) {
			const errorText = await response.text();
			console.error("Server returned non-OK status. Response:", errorText);
			throw new Error(`Server error: Status ${response.status}`);
		}
		if (response.status === 404) {
			return { singleGames: [], tournaments: [] };
		}
		if (!response.ok) {
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
	const existingModal = document.getElementById("challenge-modal-overlay");
	if (existingModal) {
		existingModal.remove();
	}
}

async function handleDuelChallenge(anchorElement: HTMLElement) {
	const existingDropdown = document.getElementById("challenge-dropdown");
	if (existingDropdown) {
		existingDropdown.remove();
		return;
	}

	let apiData: OpenGamesResponse = { openSingleGames: [], openTournaments: [] };
	try {
		const response = await fetchOpenGames();
		if (response) {
			apiData = response as unknown as OpenGamesResponse;
		}
	} catch (error) {
		console.error("Error fetching games:", error);
		return;
	}

	const availableGames: OpenGames[] = [];

	if (apiData.openSingleGames && Array.isArray(apiData.openSingleGames)) {
		apiData.openSingleGames.forEach((g: ApiOpenSingleGame) => {
			const creatorName = g.match.players.left || "Unknown";
			availableGames.push({
				type: "single",
				id: g.id,
				creator: g.creator,
				name: g.name || `Game ${g.id.substring(0, 8)}`, // Use generated name or fallback to short ID
			});
		});
	}

	if (apiData.openTournaments && Array.isArray(apiData.openTournaments)) {
		apiData.openTournaments.forEach((t: ApiOpenTournament) => {
			availableGames.push({
				type: "tournament",
				id: t.id,
				name: `Tournament: ${t.name} (${t.playersJoined}/${t.state.size})`,
			});
		});
	}

	if (availableGames.length === 0) {
		alert(`No open games available.`);
		return;
	}

	const rect = anchorElement.getBoundingClientRect();

	const dropdown = document.createElement("div");
	dropdown.id = "challenge-dropdown";
	dropdown.style.cssText = `
		position: absolute; 
		z-index: 99999;
		background: #111;
		border: 1px solid #00ffc8;
		border-radius: 4px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.8);
		width: 280px;
		max-height: 300px;
		overflow-y: auto;
		padding: 5px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	`;

	dropdown.style.top = `${rect.bottom + window.scrollY + 5}px`;

	const leftPos = rect.right - 280;
	dropdown.style.left = `${rect.left + window.scrollX}px`;

	availableGames.forEach((game) => {
		const item = document.createElement("div");
		item.textContent = game.name;
		item.title = `[${game.type.toUpperCase()}] ${game.name}`;
		item.style.cssText = `
			padding: 8px 10px;
			font-size: 13px;
			color: #fff;
			cursor: pointer;
			border-radius: 3px;
			transition: background 0.2s;
			white-space: nowrap;make 
			overflow: hidden;
			text-overflow: ellipsis;
		`;

		if (game.type === "tournament") {
			item.style.borderLeft = "2px solid #ffcc00";
			item.textContent = `🏆 ${game.name}`;
		} else {
			item.style.borderLeft = "2px solid #00ffc8";
			item.textContent = `🎾 ${game.name}`;
		}

		item.title = `[${game.type.toUpperCase()}] ${game.name}`;

		item.onmouseenter = () => (item.style.background = "rgba(0, 255, 200, 0.2)");
		item.onmouseleave = () => (item.style.background = "transparent");

		item.onclick = (e) => {
			e.stopPropagation();
			sendMessage("invite", `Are you up for a ${game.type}`, userData.activePrivateChat, game.id, game.name);
			dropdown.remove();
		};

		dropdown.appendChild(item);
	});

	// close dropdown by clicking outside of the modal
	setTimeout(() => {
		const closeMenu = (e: MouseEvent) => {
			if (!dropdown.contains(e.target as Node) && e.target !== anchorElement) {
				dropdown.remove();
				document.removeEventListener("click", closeMenu);
			}
		};
		document.addEventListener("click", closeMenu);
	}, 0);

	document.body.appendChild(dropdown);
}

export function renderChatHeaderButtons(chatHeader: HTMLElement, activeChat: string | null) {
	chatHeader.textContent = "";

	const primaryNeon = "#00ffc8"; // OLD "#00e0b3";
	const secondaryNeon = "#66ffc8"; // OLD "#33cc99";

	const title = document.createElement("span");
	title.textContent = activeChat === "Global Chat" ? "Global Chat" : `Chat with ${activeChat}`;

	title.style.flex = "1";
	title.style.fontWeight = "600";
	title.style.color = primaryNeon;
	title.style.textShadow = `0 0 5px ${secondaryNeon}`;

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
		action: (btnElement: HTMLButtonElement) => void,
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

		btn.style.color = blocked ? "white" : secondaryNeon;
		btn.style.border = `1px solid ${primaryNeon}`;
		btn.style.background = blocked ? "rgba(150, 0, 0, 0.58)" : "rgba(0, 224, 179, 0.08)";

		btn.style.cursor = "pointer";
		btn.onclick = (e) => {
			e.stopPropagation();
			action(btn);
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
			btn.style.backgroundColor = blocked ? "rgba(150, 0, 0, 0.58)" : "rgba(0, 224, 179, 0.08)";
			btn.style.boxShadow = "none";

			// text glow
			if (!blocked) {
				btn.style.textShadow = "none";
			}
		};

		return btn;
	};

	const btnProfile = createIconBtn("👤", "Open profile", () => {
		navigate(`#/user/${encodeURIComponent(activeChat!)}`);
	});

	const btnDuel = createIconBtn("⚔️", "Challenge to match", (clickedButton) => {
		handleDuelChallenge(clickedButton);
	});

	const isBlocked = userData.blockedUsers?.includes(activeChat!);

	const btnBlock = createIconBtn(
		isBlocked ? "♻️" : "🚫",
		isBlocked ? "Unblock user" : "Block user",
		() => {
			const isBlockedNow = userData.blockedUsers?.includes(activeChat!) || false;

			if (!isBlockedNow) {
				userData.blockedUsers?.push(activeChat!);
				sendMessage("block", `You've blocked ${activeChat}`, activeChat);
				console.log(`🚫 User ${activeChat} was blocked`);
			} else {
				userData.blockedUsers = userData.blockedUsers!.filter((u) => u !== activeChat);
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
	chatHeader: HTMLElement
) {
	channelListContainer.textContent = "";

	const primaryNeon = "#00ffc8";
	const secondaryNeon = "#66ffc8";
	const headerGreen = "#00A358";

	const allUsersExcludingSelfAndGlobal = generalData.onlineUsers!.filter(
		(u) => u !== userData.username && u !== "Global Chat"
	);

	const friendsOnline = allUsersExcludingSelfAndGlobal.filter((u) => userData.friends?.includes(u));
	const othersOnline = allUsersExcludingSelfAndGlobal.filter((u) => !userData.friends?.includes(u));
	const friendsOffline = userData.friends.filter((f) => !allUsersExcludingSelfAndGlobal.includes(f));

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
			userItem.style.border = `1px solid ${primaryNeon}`;
			userItem.style.boxShadow = `0 0 5px ${primaryNeon}`;
			userItem.style.color = primaryNeon;
		}

		// hover
		userItem.onmouseenter = () => {
			userItem.style.backgroundColor = isOffline ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 255, 200, 0.25)";
		};
		userItem.onmouseleave = () => {
			userItem.style.backgroundColor =
				username === userData.activePrivateChat
					? `rgba(0, 255, 200, 0.1)`
					: isOffline
					? "rgba(255, 255, 255, 0.05)"
					: `rgba(0, 255, 200, 0.1)`;
		};

		// Click handler
		userItem.onclick = () => {
			userData.activePrivateChat = username;
			localStorage.setItem("activePrivateChat", username);
			renderOnlineUsers(channelListContainer, chatMessages, chatHeader);
			chatMessages.textContent = "";
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
		friendsOnline.forEach((f) => renderUserItem(f, false));
		friendsOffline.forEach((f) => renderUserItem(f, true));
	}

	//user online
	if (othersOnline.length > 0) {
		renderSectionHeader("Online Users", headerGreen);
		othersOnline.forEach((f) => renderUserItem(f, false));
	}
}

// METHODS /////////////////////////////////////////////////////////////////////

export function sanitizeMessageInput(input: string): string {
	if (!input) {
		return "";
	}
	let sanitized = input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
	sanitized = sanitized.replace(/'/g, "&#39;");
	sanitized = sanitized.replace(/"/g, "&quot;");
	sanitized = sanitized.replace(/;/g, "");
	sanitized = sanitized.replace(/--/g, "");
	return sanitized;
}

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
		console.log(`${user} is online!`);
		if (username !== user) onlineList.push(user);
	});
	return onlineList;
}

export function addOnlineUser(username: string) {
	if (!generalData.onlineUsers!.includes(username)) generalData.onlineUsers!.push(username);
	if (!generalData.allUsers?.includes(username)) generalData.allUsers?.push(username);
}

export function removeUserFromList(username: string, list: string[] | null): string[] {
	if (!list) return [];

	return list.filter((user) => user !== username);
}

export function addUserToList(userToBlock: string, list: string[] | null): string[] {
	if (!list) list = [];
	if (!list.includes(userToBlock)) list.push(userToBlock);
	return list;
}

export async function populateChatWindow(chatHistory: chatHistory, chatMessages: HTMLElement) {
	chatMessages.textContent = "";

	let chatHistoryToAdd: Message[] = [];
	const activeChat = userData.activePrivateChat;

	if (activeChat === "Global Chat") {
		chatHistoryToAdd = chatHistory.global;
	} else {
		chatHistoryToAdd = setupPrivateChathistory(activeChat!);
	}
	const renderPromises = chatHistoryToAdd.map((message) => {
		return renderIncomingMessage(message);
	});

	const messageElements = await Promise.all(renderPromises!);

	messageElements.forEach((element) => {
		chatMessages.append(element);
	});

	requestAnimationFrame(() => {
		chatMessages.scrollTop = chatMessages.scrollHeight;
	});
}

export function appendMessageToHistory(message: Message): void {
	if (message.type === "broadcast") {
		userData.chatHistory!.global.push(message);
		return;
	}
	if (
		message.type === "direct" ||
		(message.type === "blockedByMeMessage" && message.sender === userData.username) ||
		(message.type === "blockedByOthersMessage" && message.sender === userData.username)
	) {
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
	chatHeader: HTMLElement
): () => void {
	const ws = userData.userSock;
	if (!ws) {
		console.warn("Chat socket not connected");
		return () => {};
	}

	const previousHandler = ws.onmessage;

	// get the last chatPartner
	const savedChatPartner = localStorage.getItem("activeChatPartner");
	if (savedChatPartner) {
		userData.activePrivateChat = savedChatPartner;
	} else if (!userData.activePrivateChat) {
		userData.activePrivateChat = "Global Chat";
	}

	generalData.onlineUsers = populateOnlineUserList(userData.username);

	if (userData.activePrivateChat !== "Global Chat" && !generalData.onlineUsers.includes(userData.activePrivateChat!)) {
		userData.activePrivateChat = "Global Chat";
		localStorage.setItem("activePrivateChat", "Global Chat");
	}

	populateChatWindow(userData.chatHistory!, chatMessages);
	renderOnlineUsers(friendList, chatMessages, chatHeader);
	renderChatHeaderButtons(chatHeader, userData.activePrivateChat);

	// keep chat header in sync when block/unblock happens in userProfile
	const handleUserListsUpdated = (event: Event) => {
		const custom = event as CustomEvent<{ action: "block" | "unblock"; username: string }>;
		const { action, username } = custom.detail;

		if (action === "block") {
			if (!userData.blockedUsers?.includes(username)) {
				userData.blockedUsers?.push(username);
			}
		} else if (action === "unblock") {
			userData.blockedUsers = userData.blockedUsers?.filter((u) => u !== username) ?? [];
		}

		renderChatHeaderButtons(chatHeader, userData.activePrivateChat);
		renderOnlineUsers(friendList, chatMessages, chatHeader);
	};

	document.addEventListener("userListsUpdated", handleUserListsUpdated);

	ws.onmessage = async (event) => {
		try {
			const payload = JSON.parse(event.data);
			if (payload && payload.type === "chat") {
				const msg: Message = payload.data;
				console.log("WS EVENT:", msg);

				switch (msg.type) {
					case "broadcast": {
						if (userData.activePrivateChat === "Global Chat") await displayIncomingMessage(msg, chatMessages);
						appendMessageToHistory(msg);
						break;
					}
					case "direct": {
						if (
							(userData.activePrivateChat === msg.sender || userData.activePrivateChat === msg.receiver) &&
							!userData.blockedUsers?.includes(msg.sender) &&
							!userData.blockedByUsers?.includes(msg.receiver!)
						)
							await displayIncomingMessage(msg, chatMessages);
						appendMessageToHistory(msg);
						break;
					}
					case "block": {
						if (msg.receiver === userData.username && msg.sender !== userData.username) {
							userData.blockedByUsers = addUserToList(msg.sender, userData.blockedByUsers);
						}
						appendMessageToHistory(msg);
						break;
					}
					case "unblock": {
						if (msg.receiver === userData.username && msg.sender !== userData.username) {
							userData.blockedByUsers = removeUserFromList(msg.sender, userData.blockedByUsers);
						}
						appendMessageToHistory(msg);
						break;
					}
					case "blockedByMeMessage": {
						if (userData.activePrivateChat === msg.receiver) {
							await displayIncomingMessage(msg, chatMessages);
						}
						appendMessageToHistory(msg);
						break;
					}
					case "blockedByOthersMessage": {
						if (userData.activePrivateChat === msg.receiver) {
							await displayIncomingMessage(msg, chatMessages);
						}
						appendMessageToHistory(msg);
						break;
					}
					case "invite": {
						if (userData.username === msg.receiver) {
							await displayIncomingMessage(msg, chatMessages);
						}
						appendMessageToHistory(msg);
						break;
					}
				}
			}

			if (payload && payload.type === "user-online") {
				const newUserOnline = payload.data.username;
				console.log(`${newUserOnline} is online!`);
				addOnlineUser(newUserOnline);
				renderOnlineUsers(friendList, chatMessages, chatHeader);
			}

			if (payload && payload.type === "user-offline") {
				const newUserOffline = payload.data.username;
				console.log(`${newUserOffline} left the realm!`);
				generalData.onlineUsers = removeUserFromList(newUserOffline, generalData.onlineUsers!);
				if (userData.activePrivateChat === newUserOffline) {
					userData.activePrivateChat = "Global Chat";
					localStorage.setItem("activePrivateChat", "Global Chat");
					populateChatWindow(userData.chatHistory!, chatMessages);
					renderChatHeaderButtons(chatHeader, userData.activePrivateChat);
				}
				renderOnlineUsers(friendList, chatMessages, chatHeader);
			}

			if (payload && payload.type == "block") {
				const blockedUser = payload.data.username;
				console.log(`${userData.username} blocked ${blockedUser}`);
				userData.blockedUsers = addUserToList(blockedUser, userData.blockedUsers);
				renderOnlineUsers(friendList, chatMessages, chatHeader);
			}

			if (payload && payload.type == "unblock") {
				const unblockedUser = payload.data.username;
				console.log(`${userData.username} unblocked ${unblockedUser}`);
				userData.blockedUsers = removeUserFromList(unblockedUser, userData.blockedUsers!);
				renderOnlineUsers(friendList, chatMessages, chatHeader);
			}
		} catch (err) {
			console.error("Failed to parse incoming payload", err);
		}
	};

	return () => {
		ws.onmessage = previousHandler ?? null;
		document.removeEventListener("userListsUpdated", handleUserListsUpdated);
	};
}
