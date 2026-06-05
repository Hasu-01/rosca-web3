import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import {
  loadTokenAddress,
  loadLendingAddress,
} from "./lib/ethers";
import type { PoolData } from "./lib/types";

import WalletConnect from "./components/WalletConnect";
import ContractSettings from "./components/ContractSettings";
import TokenPanel from "./components/TokenPanel";
import PoolDashboard from "./components/PoolDashboard";
import MembersPanel from "./components/MembersPanel";
import PoolActions from "./components/PoolActions";
import ReceiverPanels from "./components/ReceiverPanels";
import Timeline from "./components/Timeline";
import TransactionHistory from "./components/TransactionHistory";

const DEFAULT_TOKEN = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const DEFAULT_LENDING = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

export default function App() {
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [tokenAddr, setTokenAddr] = useState(
    () => loadTokenAddress() || DEFAULT_TOKEN
  );
  const [lendingAddr, setLendingAddr] = useState(
    () => loadLendingAddress() || DEFAULT_LENDING
  );
  const [pool, setPool] = useState<PoolData | null>(null);
  const [activePoolId, setActivePoolId] = useState(1);
  const [showGuide, setShowGuide] = useState(false);

  const connect = useCallback(async () => {
    const ethereum = window.ethereum;
    if (!ethereum) {
      alert("Vui l\u00f2ng c\u00e0i \u0111\u1eb7t MetaMask \u0111\u1ec3 s\u1eed d\u1ee5ng \u1ee9ng d\u1ee5ng.");
      return;
    }
    setConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) setAddress(accounts[0]);
      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));
    } catch (err: any) {
      console.error("Connect error:", err);
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    const handleAccounts = (accounts: string[]) => {
      setAddress(accounts.length > 0 ? accounts[0] : "");
    };
    const handleChain = (id: string) => {
      setChainId(Number(id));
    };

    ethereum.on("accountsChanged", handleAccounts);
    ethereum.on("chainChanged", handleChain);

    (async () => {
      try {
        const provider = new ethers.BrowserProvider(ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) setAddress(accounts[0]);
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
      } catch {
        // not connected yet
      }
    })();

    return () => {
      ethereum.removeListener("accountsChanged", handleAccounts);
      ethereum.removeListener("chainChanged", handleChain);
    };
  }, []);

  const handlePoolLoaded = useCallback((p: PoolData) => {
    setPool(p);
    setActivePoolId(p.id);
  }, []);

  const handleActionComplete = useCallback(() => {
    if (pool) {
      setActivePoolId(pool.id);
    }
  }, [pool]);

  const noMetaMask = typeof window !== "undefined" && !window.ethereum;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <WalletConnect
            address={address}
            chainId={chainId}
            onConnect={connect}
            connecting={connecting}
          />
        </div>
      </header>

      {noMetaMask && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
            Kh\u00f4ng t\u00ecm th\u1ea5y MetaMask. Vui l\u00f2ng c\u00e0i \u0111\u1eb7t MetaMask extension \u0111\u1ec3 s\u1eed d\u1ee5ng \u1ee9ng d\u1ee5ng.
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            N\u1ec1n t\u1ea3ng ROSCA / H\u1ee5i c\u1ed9ng \u0111\u1ed3ng tr\u00ean blockchain
          </p>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            {showGuide ? "\u1ea8n h\u01b0\u1edbng d\u1eabn" : "Xem h\u01b0\u1edbng d\u1eabn demo"}
          </button>
        </div>

        {showGuide && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">
              H\u01b0\u1edbng d\u1eabn Demo
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
              <li><strong>K\u1ebft n\u1ed1i v\u00ed</strong> \u2014 B\u1ea5m &quot;K\u1ebft n\u1ed1i MetaMask&quot; \u1edf tr\u00ean.</li>
              <li><strong>L\u01b0u \u0111\u1ecba ch\u1ec9 contract</strong> \u2014 Nh\u1eadp \u0111\u1ecba ch\u1ec9 MockERC20 v\u00e0 CommunityLending \u0111\u00e3 deploy.</li>
              <li><strong>Mint test token</strong> \u2014 D\u00f9ng panel &quot;Demo Mint cUSD&quot; \u0111\u1ec3 l\u1ea5y cUSD cho demo.</li>
              <li><strong>T\u1ea1o v\u00f2ng h\u1ee5i</strong> \u2014 Nh\u1eadp t\u00ean, s\u1ed1 ti\u1ec1n g\u00f3p, s\u1ed1 th\u00e0nh vi\u00ean r\u1ed3i b\u1ea5m &quot;T\u1ea1o Pool&quot;.</li>
              <li><strong>Th\u00e0nh vi\u00ean tham gia</strong> \u2014 M\u1ed7i v\u00ed b\u1ea5m &quot;Tham gia Pool&quot; (joinPool). Creator c\u0169ng ph\u1ea3i join.</li>
              <li><strong>B\u1eaft \u0111\u1ea7u pool</strong> \u2014 Khi \u0111\u1ee7 th\u00e0nh vi\u00ean, creator b\u1ea5m &quot;B\u1eaft \u0111\u1ea7u Pool&quot;.</li>
              <li><strong>Approve token</strong> \u2014 B\u1ea5m &quot;Approve Token&quot; \u0111\u1ec3 cho ph\u00e9p contract chuy\u1ec3n cUSD.</li>
              <li><strong>\u0110\u00f3ng h\u1ee5i</strong> \u2014 M\u1ed7i th\u00e0nh vi\u00ean b\u1ea5m &quot;\u0110\u00f3ng h\u1ee5i&quot; (deposit).</li>
              <li><strong>G\u1eedi offer / skip</strong> \u2014 Khi \u0111\u1ee7 \u0111\u00f3ng, th\u00e0nh vi\u00ean ch\u01b0a h\u1ed1t g\u1eedi m\u1ee9c ch\u1ea5p nh\u1eadn nh\u1eadn ho\u1eb7c skip.</li>
              <li><strong>Ch\u1ed1t k\u1ef3</strong> \u2014 B\u1ea5m &quot;Ch\u1ed1t k\u1ef3 n\u00e0y&quot; \u0111\u1ec3 chuy\u1ec3n ti\u1ec1n cho ng\u01b0\u1eddi ch\u1ea5p nh\u1eadn nh\u1eadn \u00edt nh\u1ea5t.</li>
              <li><strong>K\u1ef3 cu\u1ed1i</strong> \u2014 Ng\u01b0\u1eddi h\u1ed1t cu\u1ed1i kh\u00f4ng \u0111\u00f3ng. Khi c\u00e1c ng\u01b0\u1eddi \u0111\u00e3 h\u1ed1t \u0111\u00f3ng \u0111\u1ee7, contract t\u1ef1 \u0111\u1ed9ng chuy\u1ec3n ti\u1ec1n cho ng\u01b0\u1eddi cu\u1ed1i.</li>
            </ol>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <strong>L\u01b0u \u00fd quan tr\u1ecdng:</strong> Creator kh\u00f4ng t\u1ef1 \u0111\u1ed9ng l\u00e0 th\u00e0nh vi\u00ean \u2014 ph\u1ea3i joinPool. Ng\u01b0\u1eddi \u0111\u00e3 h\u1ed1t kh\u00f4ng \u0111\u01b0\u1ee3c offer l\u1ea1i. Ng\u01b0\u1eddi h\u1ed1t cu\u1ed1i kh\u00f4ng \u0111\u00f3ng \u1edf k\u1ef3 cu\u1ed1i. Final payout t\u1ef1 \u0111\u1ed9ng khi \u0111\u1ee7 \u0111\u00f3ng.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContractSettings
            tokenAddress={tokenAddr}
            lendingAddress={lendingAddr}
            onTokenChange={setTokenAddr}
            onLendingChange={setLendingAddr}
          />
          <TokenPanel
            address={address}
            tokenAddress={tokenAddr}
            lendingAddress={lendingAddr}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PoolDashboard
            address={address}
            lendingAddress={lendingAddr}
            onPoolLoaded={handlePoolLoaded}
          />
          <div className="space-y-4">
            <PoolActions
              address={address}
              lendingAddress={lendingAddr}
              chainId={chainId}
              poolId={activePoolId}
              onActionComplete={handleActionComplete}
            />
            <MembersPanel
              address={address}
              lendingAddress={lendingAddr}
              poolId={activePoolId}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Timeline pool={pool} />
          <ReceiverPanels
            address={address}
            lendingAddress={lendingAddr}
            poolId={activePoolId}
          />
        </div>

        <TransactionHistory />
      </main>

      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-xs text-slate-400">
          Community ROSCA / H\u1ee5i Platform \u2014 Demo on Hardhat Localhost &amp; Sepolia Testnet
        </div>
      </footer>
    </div>
  );
}
