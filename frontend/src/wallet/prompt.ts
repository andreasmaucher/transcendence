import { connectWallet, getWalletState, isMetaMaskAvailable } from "./wallet";
import { ensureFujiNetwork, FUJI_CHAIN_ID_HEX } from "./wallet";
import { fetchSavedMatch } from "./contract";

type SaveHandler = (opts: {
  address: string;
  state: unknown;
}) => Promise<
  | void
  | {
      tournamentId: string;
      gameId: string;
    }
>;

const SNOWTRACE_TX_BASE = "https://testnet.snowtrace.io/tx/";

let overlayEl: HTMLDivElement | null = null;
let lastShownForTick = -1;

export function showSaveMatchPrompt(gameState: any, onSave: SaveHandler) {
  function isOnFuji(chainId?: string | null) {
    return (
      (chainId || "").toLowerCase() ===
      (FUJI_CHAIN_ID_HEX || "0xa869").toLowerCase()
    );
  }
  if (
    typeof gameState?.tick === "number" &&
    gameState.tick === lastShownForTick
  )
    return;
  lastShownForTick = gameState?.tick ?? Date.now();

  if (!overlayEl) {
    overlayEl = document.createElement("div");
    overlayEl.id = "wallet-save-overlay";
    overlayEl.style.position = "fixed";
    overlayEl.style.inset = "0";
    overlayEl.style.background = "rgba(0,0,0,0.6)";
    overlayEl.style.display = "flex";
    overlayEl.style.alignItems = "center";
    overlayEl.style.zIndex = "9999";
    document.body.appendChild(overlayEl);
  } else {
    overlayEl.innerHTML = "";
    overlayEl.style.display = "flex";
  }

  const card = document.createElement("div");
  card.style.background = "#1e1e1e";
  card.style.color = "#fff";
  card.style.padding = "20px";
  card.style.borderRadius = "8px";
  card.style.minWidth = "320px";
  card.style.maxWidth = "480px";
  card.style.width = "calc(100vw - 40px)";
  card.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
  // hard-center regardless of external CSS
  card.style.position = "absolute";
  card.style.top = "50%";
  card.style.left = "50%";
  card.style.transform = "translate(-50%, -50%)";

  const title = document.createElement("h2");
  title.textContent = "Match finished";
  title.style.marginTop = "0";

  const desc = document.createElement("p");
  desc.textContent = "Connect an EVM wallet to save the match on-chain.";

  const status = document.createElement("div");
  status.style.margin = "8px 0 12px 0";
  status.style.fontFamily = "monospace";

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.gap = "8px";
  btnRow.style.marginTop = "8px";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.onclick = () => {
    if (overlayEl) overlayEl.style.display = "none";
  };

  const connectBtn = document.createElement("button");
  connectBtn.textContent = "Connect Wallet";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save to Blockchain";
  saveBtn.disabled = true;

  const details = document.createElement("pre");
  details.style.marginTop = "12px";
  details.style.padding = "12px";
  details.style.background = "#111";
  details.style.borderRadius = "6px";
  details.style.whiteSpace = "pre-wrap";
  details.style.fontSize = "12px";
  details.textContent = "";

  const refreshStatus = () => {
    const s = getWalletState();
    if (s.connected && s.address) {
      if (!isOnFuji(s.chainId)) {
        status.textContent = "Wrong network. Switch to Avalanche Fuji (43113).";
        saveBtn.disabled = true;
      } else {
        status.textContent = `Connected: ${s.address} (Fuji 43113)`;
        saveBtn.disabled = false;
      }
    } else {
      status.textContent = "Not connected";
      saveBtn.disabled = true;
    }
  };

  connectBtn.onclick = async () => {
    try {
      if (!isMetaMaskAvailable()) {
        status.textContent = "MetaMask not detected. Install the extension.";
        return;
      }
      connectBtn.disabled = true;
      status.textContent = "Connecting...";
      await connectWallet();
      // optional: try switching immediately after connect
      await ensureFujiNetwork();
      refreshStatus();
    } catch (e: any) {
      status.textContent = `Connect failed: ${e?.message || e}`;
    } finally {
      connectBtn.disabled = false;
    }
  };

  saveBtn.onclick = async () => {
    try {
      saveBtn.disabled = true;
      // enforce Fuji before saving
      await ensureFujiNetwork();
      refreshStatus();
      const s = getWalletState();
      if (!s.connected || !s.address || !isOnFuji(s.chainId)) {
        status.textContent =
          "Save blocked: connect wallet to Avalanche Fuji (43113).";
        return;
      }
      status.textContent = "Saving to blockchain...";
      const saveResult = await onSave({ address: s.address, state: gameState });
      status.textContent = "Saved! Reading back from chain...";

      const tId =
        (saveResult && (saveResult as any).tournamentId) ||
        (gameState && (gameState.tournamentId || gameState.tournament?.id)) ||
        null;
      const gId =
        (saveResult && (saveResult as any).gameId) ||
        (gameState && (gameState.gameId || gameState.id)) ||
        null;
      const txHash = (saveResult && (saveResult as any).txHash) ?? null;
      if (tId && gId) {
        try {
          const saved = await fetchSavedMatch(
            s.provider,
            String(tId),
            String(gId)
          );
          const when = new Date(saved.savedAt * 1000).toISOString();
          const txLine = txHash
            ? `<div>Tx: <a href="${SNOWTRACE_TX_BASE}${txHash}" target="_blank" rel="noopener">${txHash}</a></div>`
            : "";
          details.innerHTML =
            `<div>Contract saved:</div>` +
            `<div>- tournamentId: ${saved.tournamentId}</div>` +
            `<div>- gameId:       ${saved.gameId}</div>` +
            `<div>- gameIndex:    ${saved.gameIndex}</div>` +
            `<div>- players:      ${saved.leftUsername} vs ${saved.rightUsername}</div>` +
            `<div>- score:        ${saved.scoreLeft} - ${saved.scoreRight}</div>` +
            `<div>- reporter:     ${saved.reporter}</div>` +
            `<div>- savedAt:      ${when}</div>` +
            txLine;
          status.textContent = "Saved and verified.";
        } catch (err: any) {
          const txLine = txHash
            ? `<div>Tx: <a href="${SNOWTRACE_TX_BASE}${txHash}" target="_blank" rel="noopener">${txHash}</a></div>`
            : "";
          details.innerHTML = `Saved, but readback failed: ${err?.message || err}` + txLine;
          status.textContent = `Saved, but readback failed: ${err?.message || err}`;
        }
      } else {
        const txLine = txHash
          ? `<div>Tx: <a href="${SNOWTRACE_TX_BASE}${txHash}" target="_blank" rel="noopener">${txHash}</a></div>`
          : "";
        details.innerHTML = `Saved, but missing tournamentId/gameId for readback.` + txLine;
        status.textContent = "Saved, but missing tournamentId/gameId for readback.";
      }
    } catch (e: any) {
      status.textContent = `Save failed: ${e?.message || e}`;
      saveBtn.disabled = false;
    }
  };

  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(status);
  btnRow.appendChild(connectBtn);
  btnRow.appendChild(saveBtn);
  btnRow.appendChild(closeBtn);
  card.appendChild(btnRow);
  card.appendChild(details);

  overlayEl.appendChild(card);
  refreshStatus();
}
