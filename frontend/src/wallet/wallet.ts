/* Minimal MetaMask connection using ethers v6 */
import { BrowserProvider } from "ethers";
export const FUJI_CHAIN_ID_HEX: string = (import.meta as any).env?.VITE_AVALANCHE_FUJI_CHAIN_ID_HEX as string;
export const VITE_FUJI_RPC_URL: string = (import.meta as any).env?.VITE_FUJI_RPC_URL as string;

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

// export const AVALANCHE_FUJI_CHAIN_ID_HEX = "0xa869";

export async function ensureFujiNetwork(): Promise<void> {
	if (!window.ethereum) throw new Error("No EVM wallet detected. Please install MetaMask.");
	try {
		// Try switching to Fuji
		await window.ethereum.request({
			method: "wallet_switchEthereumChain",
			params: [{ chainId: FUJI_CHAIN_ID_HEX }],
		});
		// optimistic local update; wallet should also emit chainChanged
		state.chainId = FUJI_CHAIN_ID_HEX;
	} catch (err: any) {
		// 4902 = chain not added
		if (err?.code === 4902) {
			await window.ethereum.request({
				method: "wallet_addEthereumChain",
				params: [
					{
						chainId: FUJI_CHAIN_ID_HEX,
						chainName: "Avalanche Fuji C-Chain",
						nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
						rpcUrls: [(import.meta as any).env?.VITE_FUJI_RPC_URL],
						blockExplorerUrls: ["https://testnet.snowtrace.io"],
					},
				],
			});
			// After adding, switch to it
			await window.ethereum.request({
				method: "wallet_switchEthereumChain",
				params: [{ chainId: FUJI_CHAIN_ID_HEX }],
			});
			state.chainId = FUJI_CHAIN_ID_HEX;
		} else {
			throw err;
		}
	}
}
