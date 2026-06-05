import { ethers } from "ethers";
import { MOCK_ERC20_ABI } from "../abis/mockERC20Abi";
import { COMMUNITY_LENDING_ABI } from "../abis/communityLendingAbi";

const STORAGE_KEY_TOKEN = "rosca_mockERC20_address";
const STORAGE_KEY_LENDING = "rosca_communityLending_address";
const STORAGE_KEY_TXS = "rosca_transaction_history";

const SUPPORTED_CHAINS: Record<number, string> = {
  31337: "Hardhat Localhost",
  11155111: "Sepolia Testnet",
};

export function isSupportedChain(chainId: number): boolean {
  return chainId in SUPPORTED_CHAINS;
}

export function getChainName(chainId: number): string {
  return SUPPORTED_CHAINS[chainId] ?? `Unknown (${chainId})`;
}

// MetaMask provider detection — prefer MetaMask when multiple wallets exist
export function getMetaMaskProvider(): EthereumProvider | null {
  const ethereum = window.ethereum;
  if (!ethereum) return null;

  // Multiple providers (e.g. Coin98 + MetaMask)
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    const mm = ethereum.providers.find((p: any) => p.isMetaMask === true);
    if (mm) return mm as EthereumProvider;
  }

  // Single provider — check if it's MetaMask
  if (ethereum.isMetaMask) return ethereum;

  return null;
}

export function hasMetaMask(): boolean {
  return getMetaMaskProvider() !== null;
}

export function getProvider(): ethers.BrowserProvider | null {
  const mm = getMetaMaskProvider();
  if (!mm) return null;
  return new ethers.BrowserProvider(mm);
}

export async function getSigner(): Promise<ethers.JsonRpcSigner | null> {
  const provider = getProvider();
  if (!provider) return null;
  return provider.getSigner();
}

export function getTokenContract(
  address: string,
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  return new ethers.Contract(address, MOCK_ERC20_ABI, signerOrProvider);
}

export function getLendingContract(
  address: string,
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  return new ethers.Contract(address, COMMUNITY_LENDING_ABI, signerOrProvider);
}

export function isValidAddress(addr: string): boolean {
  return ethers.isAddress(addr);
}

export function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Token amount helpers — users enter simple numbers, we convert to 18-decimal units
export function parseTokenAmount(value: string): bigint {
  return ethers.parseUnits(value, 18);
}

export function formatTokenAmount(value: bigint | string): string {
  return ethers.formatUnits(value, 18);
}

// Kept for backward compat where raw wei strings are needed
export function formatEther(value: bigint | string): string {
  return ethers.formatEther(value);
}

export function parseEther(value: string): bigint {
  return ethers.parseEther(value);
}

// Contract address storage
export function saveTokenAddress(addr: string): void {
  localStorage.setItem(STORAGE_KEY_TOKEN, addr);
}

export function saveLendingAddress(addr: string): void {
  localStorage.setItem(STORAGE_KEY_LENDING, addr);
}

export function loadTokenAddress(): string {
  return localStorage.getItem(STORAGE_KEY_TOKEN) ?? "";
}

export function loadLendingAddress(): string {
  return localStorage.getItem(STORAGE_KEY_LENDING) ?? "";
}

export function clearSavedAddresses(): void {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_LENDING);
}

// Transaction history
export interface TxRecord {
  hash: string;
  action: string;
  from: string;
  timestamp: number;
  chainId: number;
}

export function saveTxRecord(record: TxRecord): void {
  const records = loadTxHistory();
  records.unshift(record);
  if (records.length > 50) records.length = 50;
  localStorage.setItem(STORAGE_KEY_TXS, JSON.stringify(records));
}

export function loadTxHistory(): TxRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TXS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearTxHistory(): void {
  localStorage.removeItem(STORAGE_KEY_TXS);
}

export function getExplorerUrl(chainId: number, hash: string): string | null {
  if (chainId === 11155111) {
    return `https://sepolia.etherscan.io/tx/${hash}`;
  }
  return null;
}
