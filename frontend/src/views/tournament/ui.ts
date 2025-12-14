import { navigate } from "../../router/router";
import { fetchTournamentList, fetchMe, type Tournament } from "../../api/http";
import { t } from "../../i18n";
import "./tournament.css";
import "./overlays/overlays.css";
import { createTournamentOverlay, showTournamentOverlay, hideTournamentOverlay } from "./overlays/tournament_overlay";

export async function renderTournament(container: HTMLElement) {
	container.innerHTML = "";
	let cancelled = false;

	// SCREEN
	const root = document.createElement("div");
	root.className = "tournament-screen";
	container.append(root);
	// Initialize overlays
	createTournamentOverlay(root);

	// BOX
	const box = document.createElement("div");
	box.className = "tournament-box";
	root.append(box);

	// HEADER
	const header = document.createElement("div");
	header.className = "tournament-header";
	box.append(header);

	const title = document.createElement("h1");
	title.className = "tournament-title";
	title.textContent = t("tournaments.title");
	header.append(title);

	const backBtn = document.createElement("button");
	backBtn.className = "tournament-back-btn";
	backBtn.textContent = t("tournaments.back");
	backBtn.onclick = () => navigate("#/menu");
	header.append(backBtn);

	// STATUS
	const status = document.createElement("div");
	status.className = "tournament-status";
	status.textContent = t("tournaments.loading");
	box.append(status);

	// LIST
	const list = document.createElement("div");
	list.className = "tournament-list";
	box.append(list);

	// ANDY: Function to show modal for joining a tournament with custom display name
	// Modal appears when user clicks "Join" button on a tournament
	function showJoinTournamentModal(tournamentId: string, tournamentName?: string) {
		// Create modal overlay (full screen dark background)
		const modalOverlay = document.createElement("div");
		modalOverlay.className = "tournament-modal-overlay";
		modalOverlay.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.75);
			z-index: 1000;
			display: flex;
			justify-content: center;
			align-items: center;
		`;

		// Close modal when clicking outside of it
		modalOverlay.onclick = () => {
			modalOverlay.remove();
		};

		// Create modal content box
		const modalContent = document.createElement("div");
		modalContent.className = "tournament-modal-content";
		modalContent.style.cssText = `
			background: rgba(0, 0, 0, 0.6);
			backdrop-filter: blur(8px);
			padding: 32px;
			border-radius: 12px;
			border: 2px solid #ff2cfb;
			box-shadow:
				0 0 20px #ff6bff66,
				0 0 30px #ff2cfb55,
				inset 0 0 18px #ff2cfb22;
			max-width: 480px;
			width: 90%;
			color: #ff6bff;
			font-family: Orbitron, sans-serif;
		`;

		// Prevent modal from closing when clicking inside it
		modalContent.onclick = (e) => e.stopPropagation();

		// Modal title
		const modalTitle = document.createElement("h2");
		modalTitle.className = "tournament-modal-title";
		modalTitle.textContent = tournamentName || `Join Tournament`;
		modalTitle.style.cssText = `
			margin: 0 0 20px 0;
			font-size: 24px;
			font-weight: 700;
			color: #ff2cfb;
			text-shadow: 0 0 10px #ff6bff;
		`;
		modalContent.appendChild(modalTitle);

		// ANDY: Display name input field that allows the player to set a custom display name for themselves
		const displayNameLabel = document.createElement("label");
		displayNameLabel.className = "tournament-name-label";
		displayNameLabel.textContent = t("tournaments.displayNameLabel");

		const displayNameInput = document.createElement("input");
		displayNameInput.type = "text";
		displayNameInput.className = "tournament-name-input";
		displayNameInput.placeholder = t("tournaments.displayNamePlaceholder");
		displayNameInput.maxLength = 30;

		// Add sanitation
		displayNameInput.addEventListener("input", () => {
			displayNameInput.value = displayNameInput.value.replace(/[^a-zA-Z0-9]/g, "");
		});

		displayNameLabel.appendChild(displayNameInput);
		modalContent.appendChild(displayNameLabel);

		// Button container
		const buttonContainer = document.createElement("div");
		buttonContainer.style.cssText = `
			display: flex;
			gap: 12px;
			margin-top: 24px;
			justify-content: flex-end;
		`;

		// Cancel button
		const cancelBtn = document.createElement("button");
		cancelBtn.textContent = t("tournaments.back");
		cancelBtn.style.cssText = `
			padding: 10px 16px;
			font-size: 14px;
			font-weight: bold;
			border: 2px solid #ff2cfb;
			border-radius: 6px;
			background: rgba(10,10,10,0.55);
			backdrop-filter: blur(5px);
			color: #ff6bff;
			cursor: pointer;
			font-family: Orbitron, sans-serif;
			transition: background-color 0.25s ease, box-shadow 0.25s ease, transform 0.1s ease;
		`;
		cancelBtn.onmouseenter = () => {
			cancelBtn.style.backgroundColor = "rgba(255,44,251,0.15)";
			cancelBtn.style.boxShadow = "0 0 14px #ff6bff, 0 0 22px #ff2cfb55";
		};
		cancelBtn.onmouseleave = () => {
			cancelBtn.style.backgroundColor = "rgba(10,10,10,0.55)";
			cancelBtn.style.boxShadow = "none";
		};
		cancelBtn.onclick = () => {
			modalOverlay.remove();
		};

		// Join button
		const joinBtn = document.createElement("button");
		joinBtn.textContent = t("tournaments.join");
		joinBtn.style.cssText = `
			padding: 10px 16px;
			font-size: 14px;
			font-weight: bold;
			border: 2px solid #ff2cfb;
			border-radius: 6px;
			background: rgba(10,10,10,0.55);
			backdrop-filter: blur(5px);
			color: #ff6bff;
			cursor: pointer;
			font-family: Orbitron, sans-serif;
			transition: background-color 0.25s ease, box-shadow 0.25s ease, transform 0.1s ease;
		`;
		joinBtn.onmouseenter = () => {
			joinBtn.style.backgroundColor = "rgba(255,44,251,0.15)";
			joinBtn.style.boxShadow = "0 0 14px #ff6bff, 0 0 22px #ff2cfb55";
		};
		joinBtn.onmouseleave = () => {
			joinBtn.style.backgroundColor = "rgba(10,10,10,0.55)";
			joinBtn.style.boxShadow = "none";
		};
		joinBtn.onclick = () => {
			// ANDY: get custom display name from input if provided, otherwise it will be empty and backend will use username
			const customDisplayName = displayNameInput.value.trim();
			const displayNameParam = customDisplayName ? `&displayName=${encodeURIComponent(customDisplayName)}` : "";

			modalOverlay.remove();
			navigate(`#/game?mode=tournament&id=${tournamentId}${displayNameParam}`);
		};

		// ANDY: allow Enter key to submit the form
		displayNameInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				joinBtn.click();
			}
		});

		buttonContainer.append(cancelBtn, joinBtn);
		modalContent.appendChild(buttonContainer);
		modalOverlay.appendChild(modalContent);
		document.body.appendChild(modalOverlay);

		// Focus the input field when modal opens
		setTimeout(() => displayNameInput.focus(), 100);
	}

	// ANDY: Function to show modal for tournament name input
	// Modal appears when user clicks "Create Tournament" button
	function showCreateTournamentModal() {
		// Create modal overlay (full screen dark background)
		const modalOverlay = document.createElement("div");
		modalOverlay.className = "tournament-modal-overlay";
		modalOverlay.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.75);
			z-index: 1000;
			display: flex;
			justify-content: center;
			align-items: center;
		`;

		// Close modal when clicking outside of it
		modalOverlay.onclick = () => {
			modalOverlay.remove();
		};

		// Create modal content box
		const modalContent = document.createElement("div");
		modalContent.className = "tournament-modal-content";
		modalContent.style.cssText = `
			background: rgba(0, 0, 0, 0.6);
			backdrop-filter: blur(8px);
			padding: 32px;
			border-radius: 12px;
			border: 2px solid #ff2cfb;
			box-shadow:
				0 0 20px #ff6bff66,
				0 0 30px #ff2cfb55,
				inset 0 0 18px #ff2cfb22;
			max-width: 480px;
			width: 90%;
			color: #ff6bff;
			font-family: Orbitron, sans-serif;
		`;

		// Prevent modal from closing when clicking inside it
		modalContent.onclick = (e) => e.stopPropagation();

		// Modal title
		const modalTitle = document.createElement("h2");
		modalTitle.textContent = t("tournaments.create");
		modalTitle.style.cssText = `
			margin: 0 0 20px 0;
			font-size: 24px;
			font-weight: 700;
			color: #ff2cfb;
			text-shadow: 0 0 10px #ff6bff;
		`;
		modalContent.appendChild(modalTitle);

		// ANDY: Tournament name input field that allows users to set a custom name for their tournament
		const nameLabel = document.createElement("label");
		nameLabel.className = "tournament-name-label";
		nameLabel.textContent = t("tournaments.nameLabel");

		const nameInput = document.createElement("input");
		nameInput.type = "text";
		nameInput.className = "tournament-name-input";
		nameInput.placeholder = t("tournaments.namePlaceholder");
		nameInput.maxLength = 30;

		// Add sanitation
		nameInput.addEventListener("input", () => {
			nameInput.value = nameInput.value.replace(/[^a-zA-Z0-9]/g, "");
		});

		nameLabel.appendChild(nameInput);
		modalContent.appendChild(nameLabel);

		// ANDY: Display name input field that allows the tournament creator to set a custom display name for themselves
		const displayNameLabel = document.createElement("label");
		displayNameLabel.className = "tournament-name-label";
		displayNameLabel.textContent = t("tournaments.displayNameLabel");

		const displayNameInput = document.createElement("input");
		displayNameInput.type = "text";
		displayNameInput.className = "tournament-name-input";
		displayNameInput.placeholder = t("tournaments.displayNamePlaceholder");
		displayNameInput.maxLength = 30;

		displayNameLabel.appendChild(displayNameInput);
		modalContent.appendChild(displayNameLabel);

		// Button container
		const buttonContainer = document.createElement("div");
		buttonContainer.style.cssText = `
			display: flex;
			gap: 12px;
			margin-top: 24px;
			justify-content: flex-end;
		`;

		// Cancel button
		const cancelBtn = document.createElement("button");
		cancelBtn.textContent = t("tournaments.back");
		cancelBtn.style.cssText = `
			padding: 10px 16px;
			font-size: 14px;
			font-weight: bold;
			border: 2px solid #ff2cfb;
			border-radius: 6px;
			background: rgba(10,10,10,0.55);
			backdrop-filter: blur(5px);
			color: #ff6bff;
			cursor: pointer;
			font-family: Orbitron, sans-serif;
			transition: background-color 0.25s ease, box-shadow 0.25s ease, transform 0.1s ease;
		`;
		cancelBtn.onmouseenter = () => {
			cancelBtn.style.backgroundColor = "rgba(255,44,251,0.15)";
			cancelBtn.style.boxShadow = "0 0 14px #ff6bff, 0 0 22px #ff2cfb55";
		};
		cancelBtn.onmouseleave = () => {
			cancelBtn.style.backgroundColor = "rgba(10,10,10,0.55)";
			cancelBtn.style.boxShadow = "none";
		};
		cancelBtn.onclick = () => {
			modalOverlay.remove();
		};

		// Create button
		const confirmBtn = document.createElement("button");
		confirmBtn.textContent = t("tournaments.create");
		confirmBtn.style.cssText = `
			padding: 10px 16px;
			font-size: 14px;
			font-weight: bold;
			border: 2px solid #ff2cfb;
			border-radius: 6px;
			background: rgba(10,10,10,0.55);
			backdrop-filter: blur(5px);
			color: #ff6bff;
			cursor: pointer;
			font-family: Orbitron, sans-serif;
			transition: background-color 0.25s ease, box-shadow 0.25s ease, transform 0.1s ease;
		`;
		confirmBtn.onmouseenter = () => {
			confirmBtn.style.backgroundColor = "rgba(255,44,251,0.15)";
			confirmBtn.style.boxShadow = "0 0 14px #ff6bff, 0 0 22px #ff2cfb55";
		};
		confirmBtn.onmouseleave = () => {
			confirmBtn.style.backgroundColor = "rgba(10,10,10,0.55)";
			confirmBtn.style.boxShadow = "none";
		};
		confirmBtn.onclick = async () => {
		const tournamentId = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
		const me = await fetchMe();
			// ANDY: use custom tournament name from input if provided, otherwise use our old naming logic
			const customName = nameInput.value.trim();
			const tournamentName = customName
				? customName
				: me
				? `${me.username}Tournament`
				: `Tournament${tournamentId.slice(0, 8)}`;

			// ANDY: get custom display name from input if provided, otherwise it will be empty and backend will use username
			const customDisplayName = displayNameInput.value.trim();

			modalOverlay.remove();
			const displayNameParam = customDisplayName ? `&displayName=${encodeURIComponent(customDisplayName)}` : '';
		navigate(
			`#/game?mode=tournament&id=${tournamentId}&name=${encodeURIComponent(
				tournamentName
				)}${displayNameParam}`
			);
		};

		// ANDY: allow Enter key to submit the form
		nameInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				confirmBtn.click();
			}
		});

		buttonContainer.appendChild(cancelBtn);
		buttonContainer.appendChild(confirmBtn);
		modalContent.appendChild(buttonContainer);

		modalOverlay.appendChild(modalContent);
		document.body.appendChild(modalOverlay);

		// Focus the input field when modal opens
		setTimeout(() => nameInput.focus(), 100);
	}

	// CREATE BUTTON INSIDE BOX
	const createBtn = document.createElement("button");
	createBtn.className = "tournament-create-btn";
	createBtn.textContent = t("tournaments.create");
	createBtn.onclick = showCreateTournamentModal;
	box.append(createBtn);

	// LOAD FUNCTION
	async function loadTournaments() {
		try {
			const tournaments = await fetchTournamentList();
			if (cancelled) return;

			list.innerHTML = "";

			if (!tournaments.length) {
				status.textContent = t("tournaments.none");

				const empty = document.createElement("div");
				empty.style.opacity = "0.8";
				empty.textContent = "";
				list.append(empty);

				return;
			}

			status.textContent = t("tournaments.available")(tournaments.length);

			tournaments.forEach((tour: Tournament) => {
				const row = document.createElement("div");
				row.className = "tournament-row";

				const left = document.createElement("div");
				left.style.display = "flex";
				left.style.flexDirection = "column";
				left.style.gap = "0.3rem";

				const nameLine = document.createElement("div");
				nameLine.textContent = tour.name || t("tournaments.tournamentNumber")(tour.id);
				nameLine.style.fontWeight = "bold";

				const statusLine = document.createElement("div");
				statusLine.textContent = `${t("tournaments.players")}: ${tour.playersJoined}/${tour.state.size}`;
				statusLine.style.fontSize = "0.9rem";
				statusLine.style.color = "#aaa";

				left.append(nameLine, statusLine);
				row.append(left);

				const right = document.createElement("div");
				right.style.display = "flex";
				right.style.gap = "0.5rem";

				const joinBtn = document.createElement("button");
				joinBtn.className = "tournament-row-btn";
				joinBtn.textContent = t("tournaments.join");
				joinBtn.onclick = () => {
					// ANDY: show modal to allow player to set custom display name before joining
					showJoinTournamentModal(tour.id, tour.name);
				};

				right.append(joinBtn);
				row.append(right);

				list.append(row);
			});
		} catch (err) {
			if (!cancelled) {
				status.textContent = t("tournaments.failed");
			}
		}
	}

	loadTournaments();

	// AUTO REFRESH
	const interval = setInterval(() => loadTournaments(), 2000);

	return () => {
		cancelled = true;
		clearInterval(interval);
		backBtn.onclick = null;
	};
}
