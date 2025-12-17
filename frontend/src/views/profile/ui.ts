import "./profile.css";
import { fetchMe, updateUser } from "../../api/http";
import { navigate } from "../../router/router";
import { updateTopBar } from "../topbar/ui";
import { t } from "../../i18n";
import { userData } from "../../config/constants";
import { API_BASE } from "../../config/endpoints";
import { convertUTCStringToLocal } from "../../utils/time";

export async function renderProfile(container: HTMLElement) {
	container.innerHTML = "";
	let cancelled = false;

	const root = document.createElement("div");
	root.className = "profile-screen";
	container.append(root);

	const panel = document.createElement("div");
	panel.className = "profile-panel";
	root.append(panel);

	const header = document.createElement("div");
	header.className = "profile-header";
	panel.append(header);

	const title = document.createElement("h1");
	title.textContent = t("profile.title");
	header.append(title);

	const back = document.createElement("button");
	back.className = "profile-back-btn";
	back.textContent = t("profile.backToMenu");
	back.onclick = () => navigate("#/menu");
	header.append(back);

	const status = document.createElement("div");
	status.className = "profile-status";
	status.textContent = t("profile.loading");
	panel.append(status);

	const content = document.createElement("div");
	content.className = "profile-content";
	panel.append(content);

	(async () => {
		const me = await fetchMe();
		if (!me || cancelled) {
			status.textContent = t("profile.notLoggedIn");
			return;
		}

		status.textContent = "";
		content.innerHTML = "";

		let username = me.username;
		let avatarSrc = me.avatar || "/default-avatar.png";

		// --- AVATAR CARD ---
		const avatarCard = document.createElement("div");
		avatarCard.className = "profile-card";
		content.append(avatarCard);

		const avatarWrapper = document.createElement("div");
		avatarWrapper.className = "profile-avatar-wrapper";

		const avatar = document.createElement("img");
		avatar.src = avatarSrc;
		avatar.className = "profile-avatar";

		const avatarInput = document.createElement("input");
		avatarInput.type = "file";
		avatarInput.accept = "image/*";
		avatarInput.style.display = "none";

		const overlayBtn = document.createElement("div");
		overlayBtn.className = "profile-avatar-edit";
		overlayBtn.textContent = "✎";
		overlayBtn.onclick = () => avatarInput.click();

		const avatarMsg = document.createElement("div");
		avatarMsg.className = "profile-message";
		avatarCard.append(avatarMsg);

		avatarInput.onchange = async () => {
			const file = avatarInput.files?.[0];
			if (!file) return;

			avatarMsg.textContent = "";

			const reader = new FileReader();
			reader.onload = async () => {
				avatarSrc = reader.result as string;
				avatar.src = avatarSrc;
				try {
					await updateUser({ username, newAvatar: avatarSrc });
					await updateTopBar();
					avatarMsg.textContent = t("profile.avatarUpdated");
				} catch (e) {
					avatarMsg.textContent = t("profile.updateFailed");
				}
			};
			reader.readAsDataURL(file);
		};

		avatarWrapper.append(avatar, overlayBtn, avatarInput);
		const uname = document.createElement("div");
		uname.className = "profile-username";
		uname.textContent = username;
		const joined = document.createElement("div");
		joined.className = "profile-subtext";
		joined.textContent = t("profile.joined") + new Date(me.created_at).toLocaleDateString();
		avatarCard.append(avatarWrapper, uname, joined);

		// --- PASSWORD CARD ---
		const passCard = document.createElement("div");
		passCard.className = "profile-card";
		content.append(passCard);

	const passBtn = document.createElement("button");
	passBtn.className = "profile-action-btn";
	passBtn.textContent = t("profile.changePassword");
	passCard.append(passBtn);

	const passSection = document.createElement("div");
	passSection.className = "profile-action-section";
	passCard.append(passSection);

	passBtn.onclick = () => {
		passSection.style.display = passSection.style.display === "flex" ? "none" : "flex";
	};

		// Helper text
		const passHint = document.createElement("div");
		// Styling to match the theme (smaller, slightly transparent)
		passHint.style.fontSize = "0.8em";
		passHint.style.opacity = "0.7";
		passHint.style.marginBottom = "5px";
		passHint.style.fontStyle = "italic";
		passSection.append(passHint);

		const newPass = document.createElement("input");
		newPass.type = "password";
		newPass.placeholder = t("profile.newPassword");
		newPass.className = "profile-input";

		const confirmPass = document.createElement("input");
		confirmPass.type = "password";
		confirmPass.placeholder = t("profile.confirmPassword");
		confirmPass.className = "profile-input";

		// Add sanitation
		const enforceAlphanumeric = (e: Event) => {
			const target = e.target as HTMLInputElement;
			target.value = target.value.replace(/[^a-zA-Z0-9 ]/g, "");
		};

		newPass.addEventListener("input", enforceAlphanumeric);
		confirmPass.addEventListener("input", enforceAlphanumeric);

		const passSave = document.createElement("button");
		passSave.className = "profile-btn";
		passSave.textContent = t("profile.savePassword");

		const passMsg = document.createElement("div");
		passMsg.className = "profile-message";

		passSave.onclick = async () => {
			passSave.disabled = true;
			passMsg.textContent = "";
			try {
				if (newPass.value !== confirmPass.value) {
					passMsg.textContent = t("profile.passwordsNoMatch");
					passSave.disabled = false;
					return;
				}
				if (newPass.value.length < 4) {
					passMsg.textContent = t("profile.passwordTooShort");
					passSave.disabled = false;
					return;
				}
				await updateUser({ username, newPassword: newPass.value });
				passMsg.textContent = t("profile.saved");
				newPass.value = "";
				confirmPass.value = "";
			} catch (e) {
				passMsg.textContent = t("profile.updateFailed");
			}
			passSave.disabled = false;
		};
		passSection.append(newPass, confirmPass, passSave, passMsg);

		// --- FRIENDS CARD ---
		const friendsCard = document.createElement("div");
		friendsCard.className = "profile-card";
		content.append(friendsCard);
		const fTitle = document.createElement("div");
		fTitle.className = "profile-section-title";
		fTitle.textContent = t("profile.friends");
		friendsCard.append(fTitle);
		if (!userData.friends?.length) {
			const none = document.createElement("div");
			none.textContent = t("profile.noFriends");
			none.className = "profile-subtext";
			friendsCard.append(none);
		} else {
			const list = document.createElement("div");
			list.className = "profile-friend-list";
			for (const friend of userData.friends) {
				const row = document.createElement("div");
				row.className = "profile-friend-row";
				row.onclick = () => navigate(`#/user/${friend}`);
				const fav = document.createElement("img");
				fav.className = "profile-friend-avatar";
				fav.src = "/default-avatar.png";
				fetch(`${API_BASE}/api/user/${friend}`, { credentials: "include" })
					.then((r) => r.json())
					.then((b) => {
						if (b.success && b.data.avatar) fav.src = b.data.avatar;
					});
				const fn = document.createElement("span");
				fn.textContent = friend;
				fn.className = "profile-friend-name";
				row.append(fav, fn);
				list.append(row);
			}
			friendsCard.append(list);
		}

		// ============================================================
		// STATS CARD
		// ============================================================
		const statsCard = document.createElement("div");
		statsCard.className = "profile-card";
		content.append(statsCard);

		const statsHeader = document.createElement("div");
		statsHeader.className = "profile-section-title";
		statsHeader.textContent = t("profile.stats");
		statsCard.append(statsHeader);

		const tabsWrapper = document.createElement("div");
		tabsWrapper.className = "stats-tabs-wrapper";
		statsCard.append(tabsWrapper);

		const singleTabBtn = document.createElement("div");
		singleTabBtn.className = "stats-tab-btn active";
		singleTabBtn.textContent = t("profile.singleGames");

		const tournamentTabBtn = document.createElement("div");
		tournamentTabBtn.className = "stats-tab-btn";
		tournamentTabBtn.textContent = t("profile.tournaments");

		tabsWrapper.append(singleTabBtn, tournamentTabBtn);

		const tabContent = document.createElement("div");
		tabContent.style.width = "100%";
		statsCard.append(tabContent);

		// --- HELPERS ---
		const getWinnerName = (winner: string | null, left: string, right: string | null) => {
			if (!winner) return "—";
			if (winner === "left") return left;
			if (winner === "right") {
				// If right player is null/empty/undefined -> return "Guest"
				if (!right || right.trim() === "") return "Guest";
				return right;
			}
			return winner;
		};

		const getAdversaryName = (left: string, right: string | null, me: string) => {
			if (left === me) {
				if (!right || right.trim() === "") return "Guest";
				return right;
			}
			return left;
		};

		const getOrdinal = (n: number) => {
			const s = ["th", "st", "nd", "rd"];
			const v = n % 100;
			return n + (s[(v - 20) % 10] || s[v] || s[0]);
		};

		const formatPlacement = (range: string | null) => {
			if (!range || range === "[0,0]" || range === "0-0" || range === "[0, 0]") return "—";
			try {
				const parsed = JSON.parse(range);
				if (Array.isArray(parsed) && parsed.length === 2) {
					const min = Math.min(parsed[0], parsed[1]);
					const max = Math.max(parsed[0], parsed[1]);
					if (min === 0 && max === 0) return "—";
					return `${min}-${max}`;
				}
			} catch (e) {}
			return range;
		};

		const getUserTournamentRank = (tourney: any) => {
			if (tourney.winner === username) return "1st";
			if (!tourney.matches || tourney.matches.length === 0) return "—";

			const lastMatch = tourney.matches[0]; // Matches are DESC

			let val1 = 0,
				val2 = 0;
			try {
				if (lastMatch.placement_range) {
					let parsed = JSON.parse(lastMatch.placement_range);
					if (Array.isArray(parsed) && parsed.length === 2) {
						val1 = parsed[0];
						val2 = parsed[1];
					}
				}
			} catch (e) {
				if (typeof lastMatch.placement_range === "string" && lastMatch.placement_range.includes("-")) {
					const parts = lastMatch.placement_range.split("-");
					val1 = parseInt(parts[0]);
					val2 = parseInt(parts[1]);
				}
			}

			if (val1 === 0 || val2 === 0) return "—";

			const bestRank = Math.min(val1, val2); // e.g. 3
			const worstRank = Math.max(val1, val2); // e.g. 4

			// Resolve winner specifically for 3rd/4th check
			let actualWinnerName = lastMatch.winner;
			if (actualWinnerName === "left") actualWinnerName = lastMatch.player_left;
			if (actualWinnerName === "right") {
				actualWinnerName =
					lastMatch.player_right && lastMatch.player_right.trim() !== "" ? lastMatch.player_right : "Guest";
			}

			const iWon = actualWinnerName === username;
			return getOrdinal(iWon ? bestRank : worstRank);
		};

		const PAGE_SIZE = 5;
		let singlePage = 0;
		let tournamentPage = 0;

		const renderTabContent = (tab: "single" | "tournament", data: any) => {
			tabContent.innerHTML = "";

			if (tab === "single") {
				singleTabBtn.classList.add("active");
				tournamentTabBtn.classList.remove("active");

				if (!data.singleGames.length) {
					const none = document.createElement("div");
					none.className = "stats-empty-text";
					none.textContent = t("profile.noSingleGames");
					tabContent.append(none);
					return;
				}

				const table = document.createElement("table");
				table.className = "stats-table";
				const thead = document.createElement("thead");
				thead.innerHTML = `<tr><th>${t("profile.date")}</th><th>${t("profile.adversary")}</th><th>${t(
					"profile.winner"
				)}</th><th>${t("profile.mode")}</th><th>${t("profile.notes")}</th></tr>`;
				table.append(thead);
				const tbody = document.createElement("tbody");

				

				const pageData = data.singleGames.slice(
					singlePage * PAGE_SIZE,
					(singlePage + 1) * PAGE_SIZE
				);
				pageData.forEach((g: any) => {
					const row = document.createElement("tr");
					row.innerHTML = `
                        <td>${convertUTCStringToLocal(g.started_at)}</td>
                        <td>${getAdversaryName(g.player_left, g.player_right, username)}</td>
                        <td>${getWinnerName(g.winner, g.player_left, g.player_right)}</td>
                        <td>${g.mode ?? "—"}</td>
                        <td>${g.notes ? g.notes : "—"}</td>
                    `;
					tbody.append(row);
				});
				table.append(tbody);
				tabContent.append(table);
				if (data.singleGames.length > PAGE_SIZE) {
					const pager = document.createElement("div");
					pager.className = "stats-pagination";

					const prev = document.createElement("button");
					prev.textContent = "◀";
					prev.disabled = singlePage === 0;
					prev.onclick = () => {
						singlePage--;
						renderTabContent("single", data);
					};

					const next = document.createElement("button");
					next.textContent = "▶";
					next.disabled = (singlePage + 1) * PAGE_SIZE >= data.singleGames.length;
					next.onclick = () => {
						singlePage++;
						renderTabContent("single", data);
					};

					pager.append(prev, next);
					tabContent.append(pager);
				}
			} else if (tab === "tournament") {
				singleTabBtn.classList.remove("active");
				tournamentTabBtn.classList.add("active");

				if (!data.tournaments.length) {
					const none = document.createElement("div");
					none.className = "stats-empty-text";
					none.textContent = t("profile.noTournaments");
					tabContent.append(none);
					return;
				}

				const table = document.createElement("table");
				table.className = "stats-table";
				const thead = document.createElement("thead");
				thead.innerHTML = `<tr><th>${t("profile.date")}</th><th>${t("profile.name")}</th><th>${t(
					"profile.winner"
				)}</th><th>${t("profile.userPlacement")}</th><th>${t("profile.notes")}</th></tr>`;
				table.append(thead);
				const tbody = document.createElement("tbody");

				const pageData = data.tournaments.slice(
					tournamentPage * PAGE_SIZE,
					(tournamentPage + 1) * PAGE_SIZE
				);


				pageData.forEach((tourney: any) => {
					const myRank = getUserTournamentRank(tourney);
					const tRow = document.createElement("tr");
					tRow.innerHTML = `
                        <td>${convertUTCStringToLocal(tourney.created_at)}</td>
                        <td>${tourney.name}</td>
                        <td>${tourney.winner ?? "—"}</td>
                        <td style="color:#ff2cfb; font-weight:bold;">${myRank}</td>
                        <td>${tourney.notes ?? "—"}</td>
                    `;
					tbody.append(tRow);

					const mContainerRow = document.createElement("tr");
					mContainerRow.className = "tournament-matches-row";
					const mContainerCell = document.createElement("td");
					mContainerCell.colSpan = 6;
					mContainerCell.style.padding = "0";
					mContainerCell.style.borderBottom = "none";

					let matchesHtml = `<table class="sub-stats-table"><thead><tr><th>${t("profile.adversary")}</th><th>${t(
						"profile.winner"
					)}</th><th>${t("profile.round")}</th><th>${t("profile.placementRange")}</th><th>tx</th></tr></thead><tbody>`;

					tourney.matches.forEach((m: any) => {
						const txLink = m.tx_hash 
							? `<a href="https://testnet.snowtrace.io/tx/${m.tx_hash}" target="_blank" rel="noopener" title="View on blockchain">⛓️</a>`
							: "—";
						matchesHtml += `<tr><td>${getAdversaryName(
							m.player_left,
							m.player_right,
							username
						)}</td><td>${getWinnerName(m.winner, m.player_left, m.player_right)}</td><td>${
							m.round ?? "—"
						}</td><td>${formatPlacement(m.placement_range)}</td><td>${txLink}</td></tr>`;
					});
					matchesHtml += `</tbody></table>`;
					mContainerCell.innerHTML = matchesHtml;
					mContainerRow.append(mContainerCell);
					tbody.append(mContainerRow);
				});
				table.append(tbody);
				tabContent.append(table);
				if (data.tournaments.length > PAGE_SIZE) {
					const pager = document.createElement("div");
					pager.className = "stats-pagination";

					const prev = document.createElement("button");
					prev.textContent = "◀";
					prev.disabled = tournamentPage === 0;
					prev.onclick = () => {
						tournamentPage--;
						renderTabContent("tournament", data);
					};

					const next = document.createElement("button");
					next.textContent = "▶";
					next.disabled = (tournamentPage + 1) * PAGE_SIZE >= data.tournaments.length;
					next.onclick = () => {
						tournamentPage++;
						renderTabContent("tournament", data);
					};

					pager.append(prev, next);
					tabContent.append(pager);
				}
			}
		};

		fetch(`${API_BASE}/api/games/of/${username}`, { credentials: "include" })
			.then((r) => r.json())
			.then((res) => {
				if (!res.success) return;
				const data = res.data;
				console.log("User games", data);
				renderTabContent("single", data);
				singleTabBtn.onclick = () => {
					singlePage = 0;
					renderTabContent("single", data);
				};

				tournamentTabBtn.onclick = () => {
					tournamentPage = 0;
					renderTabContent("tournament", data);
				};
			})
			.catch((err) => {
				const errDiv = document.createElement("div");
				errDiv.className = "stats-empty-text";
				errDiv.textContent = t("profile.statsLoadFailed");
				tabContent.append(errDiv);
			});
	})();

	return () => {
		cancelled = true;
		back.onclick = null;
	};
}
