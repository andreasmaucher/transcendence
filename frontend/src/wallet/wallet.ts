/* Minimal MetaMask connection using ethers v6 */
import { BrowserProvider } from "ethers";

type EthereumProvider = {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] | object }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export type WalletState = {
  connected: boolean;
  address: string | null;
  chainId: string | null;
  provider: BrowserProvider | null;
};

let state: WalletState = {
  connected: false,
  address: null,
  chainId: null,
  provider: null,
};

export function getWalletState(): WalletState {
  return state;
}

export function isMetaMaskAvailable(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

export async function connectWallet(): Promise<WalletState> {
  if (!window.ethereum) {
    throw new Error("No EVM wallet detected. Please install MetaMask.");
  }
  const accounts: string[] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  const chainId: string = await window.ethereum.request({
    method: "eth_chainId",
  });

  const provider = new BrowserProvider(window.ethereum as any);
  state = {
    connected: accounts.length > 0,
    address: accounts[0] ?? null,
    chainId,
    provider,
  };

  window.ethereum.on?.("accountsChanged", (accs: string[]) => {
    state.connected = accs.length > 0;
    state.address = accs[0] ?? null;
  });
  window.ethereum.on?.("chainChanged", (cid: string) => {
    state.chainId = cid;
  });

  return state;
}
