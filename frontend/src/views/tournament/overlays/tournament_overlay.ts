// src/views/tournament/overlays/tournament_overlay.ts

import { fetchUserPublic } from "../../../api/http";
import { t } from "../../../i18n";

type TournamentOverlayMode = "waiting" | "match-ready" | "between-rounds" | "final";

export type TournamentMatchType =
    | "normal"
    | "final"
    | "thirdPlace"
    | "placement"
    | string;

export interface BracketPlayerSlot {
    username: string;
    displayName?: string;
}

export interface BracketResults {
    semiFinal1Winner?: string;
    semiFinal2Winner?: string;
    finalWinner?: string;
    thirdPlaceWinner?: string;
}

export interface BracketSnapshot4 {
    players: [
        BracketPlayerSlot | null,
        BracketPlayerSlot | null,
        BracketPlayerSlot | null,
        BracketPlayerSlot | null
    ];
    results?: BracketResults;
}

interface WaitingOverlayData {
    roundLabel?: string;
    bracket: BracketSnapshot4;
    focusedPlayerUsername?: string;
}

interface MatchReadyOverlayData {
    roundLabel?: string;
    bracket: BracketSnapshot4;
    focusedPlayerUsername?: string;
}

interface BetweenRoundsOverlayData {
    title?: string;
    bracket: BracketSnapshot4;
    focusedPlayerUsername?: string;
}

interface FinalOverlayData {
    title?: string;
    bracket: BracketSnapshot4;
    focusedPlayerUsername?: string;
}

type OverlayData =
    | WaitingOverlayData
    | MatchReadyOverlayData
    | BetweenRoundsOverlayData
    | FinalOverlayData;

let overlayEl: HTMLElement | null = null;
let mode: TournamentOverlayMode | null = null;
// ANDY: store current overlay data so we can re-render when language changes
let currentOverlayData: OverlayData | null = null;

export function createTournamentOverlay(container: HTMLElement) {
    overlayEl = document.createElement("div");
    overlayEl.className = "tournament-overlay hidden";

    overlayEl.innerHTML = `
        <div class="tournament-overlay-content">
            <div class="tournament-overlay-title"></div>
            <div class="tournament-overlay-body"></div>
        </div>
    `;

    container.appendChild(overlayEl);
}

function isFocusedUsername(focused?: string, username?: string | null): boolean {
    if (!focused || !username) return false;
    return focused === username;
}

function findPlayer(players: (BracketPlayerSlot | null)[], username: string): BracketPlayerSlot | null {
    for (const p of players) {
        if (p && p.username === username) return p;
    }
    return null;
}

function clonePlayerOrCreate(
    players: (BracketPlayerSlot | null)[],
    username: string | undefined
): BracketPlayerSlot | null {
    if (!username) return null;
    const found = findPlayer(players, username);
    if (found) return { ...found };
    return { username };
}

function createBracketSlot(
    player: BracketPlayerSlot | null,
    options?: {
        extraClass?: string;
        highlight?: boolean;
        label?: string;
    }
): HTMLElement {
    const slot = document.createElement("div");
    slot.className = "tournament-bracket-slot";
    if (options?.extraClass) slot.classList.add(options.extraClass);
    if (options?.highlight) slot.classList.add("tournament-bracket-slot-focused");

    const nameEl = document.createElement("div");
    nameEl.className = "tournament-bracket-slot-name";
    nameEl.textContent = player ? player.displayName || player.username : "—";
    slot.appendChild(nameEl);

    if (options?.label) {
        const labelEl = document.createElement("div");
        labelEl.className = "tournament-bracket-slot-label";
        labelEl.textContent = options.label;
        slot.appendChild(labelEl);
    }

    return slot;
}

function buildBracketView(
    bracket: BracketSnapshot4,
    focusedPlayerUsername?: string,
    matchType?: TournamentMatchType
): HTMLElement {
    const root = document.createElement("div");
    root.className = "tournament-bracket";

    const [p1, p2, p3, p4] = bracket.players;
    const players = bracket.players;
    const results = bracket.results || {};

    // ---------- SEMIFINALS ----------
    const col1 = document.createElement("div");
    col1.className = "tournament-bracket-col tournament-bracket-col-semifinals";

    const sf1 = document.createElement("div");
    sf1.className = "tournament-bracket-match";
    sf1.appendChild(
        createBracketSlot(p1, {
            highlight: isFocusedUsername(focusedPlayerUsername, p1?.username),
        })
    );
    sf1.appendChild(
        createBracketSlot(p2, {
            highlight: isFocusedUsername(focusedPlayerUsername, p2?.username),
        })
    );

    const sf2 = document.createElement("div");
    sf2.className = "tournament-bracket-match";
    sf2.appendChild(
        createBracketSlot(p3, {
            highlight: isFocusedUsername(focusedPlayerUsername, p3?.username),
        })
    );
    sf2.appendChild(
        createBracketSlot(p4, {
            highlight: isFocusedUsername(focusedPlayerUsername, p4?.username),
        })
    );

    col1.appendChild(sf1);
    col1.appendChild(sf2);

    // ---------- FINAL + THIRD PLACE ----------
    let finalP1: BracketPlayerSlot | null = null;
    let finalP2: BracketPlayerSlot | null = null;
    let thirdP1: BracketPlayerSlot | null = null;
    let thirdP2: BracketPlayerSlot | null = null;

    if (results.semiFinal1Winner) {
        finalP1 = clonePlayerOrCreate(players, results.semiFinal1Winner);
    }
    if (results.semiFinal2Winner) {
        finalP2 = clonePlayerOrCreate(players, results.semiFinal2Winner);
    }

    if (results.semiFinal1Winner && (p1 || p2)) {
        const sf1Players = [p1, p2].filter(Boolean) as BracketPlayerSlot[];
        const loser1 = sf1Players.find((pl) => pl.username !== results.semiFinal1Winner);
        if (loser1) thirdP1 = { ...loser1 };
    }
    if (results.semiFinal2Winner && (p3 || p4)) {
        const sf2Players = [p3, p4].filter(Boolean) as BracketPlayerSlot[];
        const loser2 = sf2Players.find((pl) => pl.username !== results.semiFinal2Winner);
        if (loser2) thirdP2 = { ...loser2 };
    }

    const col2 = document.createElement("div");
    col2.className = "tournament-bracket-col tournament-bracket-col-finals";

    // FINAL
    const finalMatch = document.createElement("div");
    finalMatch.className = "tournament-bracket-final";

    const finalLabel = document.createElement("div");
    finalLabel.className = "tournament-bracket-slot-label";
    finalLabel.textContent = t("tournaments.final");
    finalMatch.appendChild(finalLabel);

    finalMatch.appendChild(
        createBracketSlot(finalP1, {
            extraClass: "tournament-bracket-slot-final",
            highlight: !!finalP1 && isFocusedUsername(focusedPlayerUsername, finalP1.username),
        })
    );
    finalMatch.appendChild(
        createBracketSlot(finalP2, {
            extraClass: "tournament-bracket-slot-final",
            highlight: !!finalP2 && isFocusedUsername(focusedPlayerUsername, finalP2.username),
        })
    );

    // THIRD PLACE
    const thirdMatch = document.createElement("div");
    thirdMatch.className = "tournament-bracket-third";

    const thirdLabel = document.createElement("div");
    thirdLabel.className = "tournament-bracket-slot-label";
    thirdLabel.textContent = t("tournaments.thirdPlace");
    thirdMatch.appendChild(thirdLabel);

    thirdMatch.appendChild(
        createBracketSlot(thirdP1, {
            extraClass: "tournament-bracket-slot-third",
            highlight: !!thirdP1 && isFocusedUsername(focusedPlayerUsername, thirdP1.username),
        })
    );
    thirdMatch.appendChild(
        createBracketSlot(thirdP2, {
            extraClass: "tournament-bracket-slot-third",
            highlight: !!thirdP2 && isFocusedUsername(focusedPlayerUsername, thirdP2.username),
        })
    );

    col2.appendChild(finalMatch);
    col2.appendChild(thirdMatch);

    // ---------- CHAMPION ----------
    const trophyBox = document.createElement("div");
    trophyBox.className = "tournament-bracket-trophy";

    const avatarWrap = document.createElement("div");
    avatarWrap.className = "tournament-bracket-trophy-avatar-wrap";
    
    const avatarImg = document.createElement("img");
    avatarImg.className = "tournament-bracket-trophy-avatar";
    avatarImg.src = "/default-avatar.png";
    avatarImg.style.display = "none";
    avatarWrap.appendChild(avatarImg);
    
    // ANDY: add champion name inside the circle if final is finished
    if (results.finalWinner) {
        const championNameInCircle = document.createElement("div");
        championNameInCircle.style.cssText = "color: white; font-size: 10px; font-weight: bold; text-align: center; padding: 0 2px; word-break: break-word; line-height: 1.1; max-width: 82px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; flex-shrink: 0;";
        
        // Find champion in players array to get display name
        const championPlayer = players.find(p => p?.username === results.finalWinner);
        const championName = championPlayer?.displayName || championPlayer?.username || results.finalWinner;
        championNameInCircle.textContent = championName;
        
        avatarWrap.appendChild(championNameInCircle);
    }
    
    trophyBox.appendChild(avatarWrap);

    const championLabel = document.createElement("div");
    championLabel.className = "tournament-bracket-champion-name";
    championLabel.textContent = t("tournaments.champion");
    trophyBox.appendChild(championLabel);

    root.appendChild(col1);
    root.appendChild(col2);
    root.appendChild(trophyBox);

    return root;
}

async function loadChampionAvatarIfNeeded(bracket: BracketSnapshot4) {
    if (!overlayEl) return;

    const finalWinner = bracket.results?.finalWinner;
    if (!finalWinner) return;

    try {
        const user = await fetchUserPublic(finalWinner);
        const avatarUrl = user.avatar || "/default-avatar.png";

        const avatarImg = overlayEl.querySelector(
            ".tournament-bracket-trophy-avatar"
        ) as HTMLImageElement | null;

        if (avatarImg) {
            avatarImg.src = avatarUrl;
            avatarImg.style.display = "block";
        }
    } catch {}
}

export function showTournamentOverlay(newMode: TournamentOverlayMode, rawData: OverlayData) {
    if (!overlayEl) return;
    mode = newMode;
    currentOverlayData = rawData; // ANDY: store current data for translation updates

    const titleEl = overlayEl.querySelector(".tournament-overlay-title") as HTMLElement;
    const bodyEl = overlayEl.querySelector(".tournament-overlay-body") as HTMLElement;

    bodyEl.innerHTML = "";

    // SAFELY normalize null → undefined
    const focused = (rawData as any).focusedPlayerUsername ?? undefined;

    if (newMode === "waiting") {
        const data = rawData as WaitingOverlayData;
        titleEl.textContent = data.roundLabel || t("tournaments.waitingForPlayers");

        const bracketEl = buildBracketView(data.bracket, focused, "normal");
        bodyEl.appendChild(bracketEl);
    }
    else if (newMode === "match-ready") {
        const data = rawData as MatchReadyOverlayData;
        titleEl.textContent = data.roundLabel || t("tournaments.matchReady");

        const bracketEl = buildBracketView(data.bracket, focused, "normal");
        bodyEl.appendChild(bracketEl);
    }
    else if (newMode === "between-rounds") {
        const data = rawData as BetweenRoundsOverlayData;
        titleEl.textContent = data.title || t("tournaments.roundComplete");

        const bracketEl = buildBracketView(data.bracket, focused, "normal");
        bodyEl.appendChild(bracketEl);
    }
    else if (newMode === "final") {
        const data = rawData as FinalOverlayData;
        titleEl.textContent = data.title || t("tournaments.tournamentFinished");

        const bracketEl = buildBracketView(data.bracket, focused, "final");
        bodyEl.appendChild(bracketEl);

        void loadChampionAvatarIfNeeded(data.bracket);
    }

    overlayEl.classList.remove("hidden");
}

export function hideTournamentOverlay() {
    if (!overlayEl) return;
    overlayEl.classList.add("hidden");
    currentOverlayData = null; // ANDY: clear stored data when hiding
}

// ANDY: function to update tournament overlay translations when language changes
export function updateTournamentOverlayTranslations() {
    if (!overlayEl || !mode || !currentOverlayData) return;
    // Re-render the overlay with current data to update translations
    showTournamentOverlay(mode, currentOverlayData);
}


