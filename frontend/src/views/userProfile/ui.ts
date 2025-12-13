import "./userProfile.css";
import { navigate } from "../../router/router";
import { t } from "../../i18n";
import { fetchUserPublic } from "../../api/http";
import { userData } from "../../config/constants";
import { API_BASE } from "../../config/endpoints";
import { appendMessageToHistory, sendMessage } from "../../chat/chatHandler";

export async function renderUserProfile(container: HTMLElement, username?: string) {
	container.innerHTML = "";
	let cancelled = false;

	try {
		const meRes = await fetch(`${API_BASE}/api/user/data`, { credentials: "include" });
		const meBody = await meRes.json();
		if (meBody.success) {
			userData.friends = meBody.data.friends ?? [];
			userData.blockedUsers = meBody.data.blockedUsers ?? [];
		}
	} catch (e) {}

	const root = document.createElement("div");
	root.className = "user-profile-root";
	container.append(root);

	const card = document.createElement("div");
	card.className = "user-profile-card";
	root.append(card);

	const header = document.createElement("div");
	header.className = "user-profile-header";
	card.append(header);

	const title = document.createElement("h1");
	title.className = "user-profile-title";
	title.textContent = t("userProfile.title");
	header.append(title);

	const back = document.createElement("button");
	back.className = "user-profile-back";
	back.textContent = t("profile.backToMenu");
	back.onclick = () => navigate("#/menu");
	header.append(back);

	const status = document.createElement("div");
	status.textContent = t("userProfile.loading");
	card.append(status);

	try {
		const user = await fetchUserPublic(username!);
		if (cancelled) return;

		status.remove();

		const top = document.createElement("div");
		top.className = "profile-top-card";
		card.append(top);

		const avatar = document.createElement("img");
		avatar.className = "profile-avatar";
		avatar.src = user.avatar || "/default-avatar.png";
		top.append(avatar);

		const name = document.createElement("div");
		name.className = "profile-name";
		name.textContent = user.username;
		top.append(name);

		const joined = document.createElement("div");
		joined.className = "profile-joined";
		joined.textContent = t("userProfile.joined") + new Date(user.created_at).toLocaleDateString();
		top.append(joined);

		if (user.username !== userData.username) {
			const actions = document.createElement("div");
			actions.className = "profile-actions";
			card.append(actions);

			const friendBtn = document.createElement("button");
			friendBtn.className = "profile-action-btn";
			friendBtn.textContent = userData.friends?.includes(user.username)
				? t("userProfile.removeFriend")
				: t("userProfile.addFriend");
			friendBtn.onclick = async () => {
				friendBtn.disabled = true;
				try {
					const isFriend = userData.friends?.includes(user.username);
					await fetch(`${API_BASE}/api/user/${isFriend ? "remove-friend" : "add-friend"}`, {
						method: "POST",
						credentials: "include",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ username: userData.username, friend: user.username }),
					});
					const res = await fetch(`${API_BASE}/api/user/data`, { credentials: "include" });
					const body = await res.json();
					if (body.success) userData.friends = body.data.friends;
					friendBtn.textContent = userData.friends?.includes(user.username)
						? t("userProfile.removeFriend")
						: t("userProfile.addFriend");
				} catch {}
				friendBtn.disabled = false;
			};
			actions.append(friendBtn);

      // BLOCK BTN
      const blockBtn = document.createElement("button");
      blockBtn.className = "profile-action-btn secondary";
      blockBtn.textContent = userData.blockedUsers.includes(user.username)
        ? t("userProfile.unblock")
        : t("userProfile.block");

      blockBtn.onclick = () => {
        const isBlocked = userData.blockedUsers.includes(user.username);
        if (isBlocked) {
          userData.blockedUsers = userData.blockedUsers.filter(b => b !== user.username);
          sendMessage("unblock", t("userProfile.youUnblocked") + user.username, user.username);
          blockBtn.textContent = t("userProfile.block");
        } else {
          userData.blockedUsers.push(user.username);
          sendMessage("block", t("userProfile.youBlocked") + user.username, user.username);
          blockBtn.textContent = t("userProfile.unblock");
        }
        // send the information to the chat
        document.dispatchEvent(new CustomEvent('userListsUpdated', { 
            detail: { 
                action: isBlocked ? 'unblock' : 'block',
                username: user.username 
            }
        }));
      };

      actions.append(blockBtn);
    }

		const friendCard = document.createElement("div");
		friendCard.className = "profile-section-card";
		card.append(friendCard);
		const fTitle = document.createElement("div");
		fTitle.className = "profile-section-title";
		fTitle.textContent = t("userProfile.friends");
		friendCard.append(fTitle);
		const friendList = document.createElement("div");
		friendList.className = "profile-friends-list";
		friendCard.append(friendList);

		let friendsParsed: string[] = [];
		try {
			if (typeof user.friends === "string") friendsParsed = JSON.parse(user.friends);
		} catch {}

		if (friendsParsed.length === 0) {
			const none = document.createElement("div");
			none.className = "profile-no-friends";
			none.textContent = t("userProfile.noFriends");
			friendList.append(none);
		} else {
			for (const friend of friendsParsed) {
				const row = document.createElement("div");
				row.className = "profile-friend-row";
				row.onclick = () => navigate(`#/user/${friend}`);
				const avatarImg = document.createElement("img");
				avatarImg.className = "profile-friend-avatar";
				avatarImg.src = "/default-avatar.png";
				fetch(`${API_BASE}/api/user/${friend}`, { credentials: "include" })
					.then((r) => r.json())
					.then((b) => {
						if (b.success && b.data.avatar) avatarImg.src = b.data.avatar;
					});
				const uname = document.createElement("span");
				uname.className = "profile-friend-name";
				uname.textContent = friend;
				row.append(avatarImg, uname);
				friendList.append(row);
			}
		}

		// ============================================================
		// STATS SECTION (Uses 'public-stats' classes for Purple theme)
		// ============================================================
		const statsCard = document.createElement("div");
		statsCard.className = "profile-section-card";
		card.append(statsCard);

		const statsHeader = document.createElement("div");
		statsHeader.className = "profile-section-title";
		statsHeader.textContent = t("profile.stats");
		statsCard.append(statsHeader);

		const tabsWrapper = document.createElement("div");
		tabsWrapper.className = "public-stats-tabs-wrapper";
		statsCard.append(tabsWrapper);

		const singleTabBtn = document.createElement("div");
		singleTabBtn.className = "public-stats-tab-btn active";
		singleTabBtn.textContent = t("profile.singleGames");

		const tournamentTabBtn = document.createElement("div");
		tournamentTabBtn.className = "public-stats-tab-btn";
		tournamentTabBtn.textContent = t("profile.tournaments");

		tabsWrapper.append(singleTabBtn, tournamentTabBtn);

		const tabContent = document.createElement("div");
		tabContent.style.width = "100%";
		statsCard.append(tabContent);

		// --- HELPERS ---
		const formatDate = (d: string | null) => {
			if (!d) return "—";
			const date = new Date(d);
			return new Date(date.getTime() + 60 * 60 * 1000).toLocaleString();
		};

		const getWinnerName = (winner: string | null, left: string, right: string | null) => {
			if (!winner) return "—";
			if (winner === "left") return left;
			if (winner === "right") {
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
			if (tourney.winner === user.username) return "1st";
			if (!tourney.matches || tourney.matches.length === 0) return "—";

			const lastMatch = tourney.matches[0];
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

			const bestRank = Math.min(val1, val2);
			const worstRank = Math.max(val1, val2);

			let actualWinnerName = lastMatch.winner;
			if (actualWinnerName === "left") actualWinnerName = lastMatch.player_left;
			if (actualWinnerName === "right") {
				actualWinnerName =
					lastMatch.player_right && lastMatch.player_right.trim() !== "" ? lastMatch.player_right : "Guest";
			}

			const iWon = actualWinnerName === user.username;
			const rank = iWon ? bestRank : worstRank;

			return getOrdinal(rank);
		};

		const renderTabContent = (tab: "single" | "tournament", data: any) => {
			tabContent.innerHTML = "";

			if (tab === "single") {
				singleTabBtn.classList.add("active");
				tournamentTabBtn.classList.remove("active");

				if (!data.singleGames.length) {
					const none = document.createElement("div");
					none.className = "public-stats-empty-text";
					none.textContent = t("profile.noSingleGames");
					tabContent.append(none);
					return;
				}

				const table = document.createElement("table");
				table.className = "public-stats-table";
				const thead = document.createElement("thead");
				thead.innerHTML = `<tr><th>${t("profile.date")}</th><th>${t("profile.adversary")}</th><th>${t(
					"profile.winner"
				)}</th><th>${t("profile.mode")}</th><th>${t("profile.notes")}</th></tr>`;
				table.append(thead);
				const tbody = document.createElement("tbody");

				data.singleGames.forEach((g: any) => {
					const row = document.createElement("tr");
					row.innerHTML = `
                    <td>${formatDate(g.started_at)}</td>
                    <td>${getAdversaryName(g.player_left, g.player_right, user.username)}</td>
                    <td>${getWinnerName(g.winner, g.player_left, g.player_right)}</td>
                    <td>${g.mode ?? "—"}</td>
                    <td>${g.notes ? g.notes : "—"}</td>
                `;
					tbody.append(row);
				});
				table.append(tbody);
				tabContent.append(table);
			} else if (tab === "tournament") {
				singleTabBtn.classList.remove("active");
				tournamentTabBtn.classList.add("active");

				if (!data.tournaments.length) {
					const none = document.createElement("div");
					none.className = "public-stats-empty-text";
					none.textContent = t("profile.noTournaments");
					tabContent.append(none);
					return;
				}

				const table = document.createElement("table");
				table.className = "public-stats-table";
				const thead = document.createElement("thead");
				thead.innerHTML = `<tr><th>${t("profile.date")}</th><th>${t("profile.name")}</th><th>${t(
					"profile.winner"
				)}</th><th>${t("profile.userPlacement")}</th><th>${t("profile.notes")}</th></tr>`;
				table.append(thead);
				const tbody = document.createElement("tbody");

				data.tournaments.forEach((tourney: any) => {
					const myRank = getUserTournamentRank(tourney);
					const tRow = document.createElement("tr");
					tRow.innerHTML = `
                    <td>${formatDate(tourney.created_at)}</td>
                    <td>${tourney.name}</td>
                    <td>${tourney.winner ?? "—"}</td>
                    <td style="color:var(--primary); font-weight:bold;">${myRank}</td>
                    <td>${tourney.notes ?? "—"}</td>
                `;
					tbody.append(tRow);

					const mContainerRow = document.createElement("tr");
					mContainerRow.className = "tournament-matches-row";
					const mContainerCell = document.createElement("td");
					mContainerCell.colSpan = 5;
					mContainerCell.style.padding = "0";
					mContainerCell.style.borderBottom = "none";

					let matchesHtml = `<table class="public-sub-stats-table"><thead><tr><th>${t(
						"profile.adversary"
					)}</th><th>${t("profile.winner")}</th><th>${t("profile.round")}</th><th>${t(
						"profile.placementRange"
					)}</th></tr></thead><tbody>`;
					tourney.matches.forEach((m: any) => {
						matchesHtml += `<tr><td>${getAdversaryName(
							m.player_left,
							m.player_right,
							user.username
						)}</td><td>${getWinnerName(m.winner, m.player_left, m.player_right)}</td><td>${
							m.round ?? "—"
						}</td><td>${formatPlacement(m.placement_range)}</td></tr>`;
					});
					matchesHtml += `</tbody></table>`;
					mContainerCell.innerHTML = matchesHtml;
					mContainerRow.append(mContainerCell);
					tbody.append(mContainerRow);
				});
				table.append(tbody);
				tabContent.append(table);
			}
		};

		fetch(`${API_BASE}/api/games/of/${user.username}`, { credentials: "include" })
			.then((r) => r.json())
			.then((res) => {
				if (!res.success) return;
				const data = res.data;
				renderTabContent("single", data);
				singleTabBtn.onclick = () => renderTabContent("single", data);
				tournamentTabBtn.onclick = () => renderTabContent("tournament", data);
			})
			.catch((err) => {
				const errDiv = document.createElement("div");
				errDiv.className = "public-stats-empty-text";
				errDiv.textContent = t("profile.statsLoadFailed");
				tabContent.append(errDiv);
			});
	} catch (err) {
		status.textContent = t("userProfile.failedLoad");
	}

	return () => {
		cancelled = true;
		back.onclick = null;
	};
}
