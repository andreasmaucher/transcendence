import { connectWallet, getWalletState, isMetaMaskAvailable } from "./wallet";

type SaveHandler = (opts: { address: string; state: unknown }) => Promise<void>;

let overlayEl: HTMLDivElement | null = null;
let lastShownForTick = -1;

export function showSaveMatchPrompt(gameState: any, onSave: SaveHandler) {
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
    overlayEl.style.justifyContent = "center";
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
  card.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";

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

  const refreshStatus = () => {
    const s = getWalletState();
    if (s.connected && s.address) {
      status.textContent = `Connected: ${s.address} (chain ${s.chainId})`;
      saveBtn.disabled = false;
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
      refreshStatus();
    } catch (e: any) {
      status.textContent = `Connect failed: ${e?.message ?? String(e)}`;
    } finally {
      connectBtn.disabled = false;
    }
  };

  saveBtn.onclick = async () => {
    const s = getWalletState();
    if (!s.connected || !s.address) return;
    try {
      saveBtn.disabled = true;
      await onSave({ address: s.address, state: gameState });
      status.textContent = "Saved! You can close this dialog.";
    } catch (e: any) {
      status.textContent = `Save failed: ${e?.message ?? String(e)}`;
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

  overlayEl.appendChild(card);
  refreshStatus();
}
