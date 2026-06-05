import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import {
  loadTokenAddress,
  loadLendingAddress,
  getMetaMaskProvider,
  hasMetaMask,
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
import DemoMode from "./components/DemoMode";

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
    const mm = getMetaMaskProvider();
    if (!mm) {
      alert("Không tìm thấy MetaMask. Vui lòng tắt các ví khác như Coin98 hoặc cài MetaMask.");
      return;
    }
    setConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(mm);
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
    const mm = getMetaMaskProvider();
    if (!mm) return;

    const handleAccounts = (accounts: string[]) => {
      setAddress(accounts.length > 0 ? accounts[0] : "");
    };
    const handleChain = (id: string) => {
      setChainId(Number(id));
    };

    mm.on("accountsChanged", handleAccounts);
    mm.on("chainChanged", handleChain);

    (async () => {
      try {
        const provider = new ethers.BrowserProvider(mm);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) setAddress(accounts[0]);
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
      } catch {
        // not connected yet
      }
    })();

    return () => {
      mm.removeListener("accountsChanged", handleAccounts);
      mm.removeListener("chainChanged", handleChain);
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

  const handleDemoPoolRefresh = useCallback(() => {
    // Re-trigger pool load
    setActivePoolId(1);
  }, []);

  const metaMaskMissing = typeof window !== "undefined" && !hasMetaMask();

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

      {metaMaskMissing && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
            Không tìm thấy MetaMask. Vui lòng tắt các ví khác như Coin98 hoặc cài MetaMask.
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Subtitle */}
        <p className="text-sm text-slate-500 -mt-2">
          Cùng góp đều mỗi kỳ, nhận lượt theo quy tắc minh bạch trên blockchain.
        </p>

        {/* Guide Toggle */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            {showGuide ? "Ẩn hướng dẫn" : "Xem hướng dẫn demo nhanh"}
          </button>
        </div>

        {/* Demo Guide */}
        {showGuide && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">
              Hướng dẫn demo nhanh
            </h2>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-600">
              <li>Kết nối MetaMask.</li>
              <li>Lưu địa chỉ hợp đồng.</li>
              <li>Nạp token demo cho từng ví.</li>
              <li>Tạo vòng hụi mới.</li>
              <li>Các thành viên lần lượt tham gia.</li>
              <li>Chủ vòng hụi bắt đầu vòng.</li>
              <li>Mỗi thành viên cho phép hợp đồng dùng token.</li>
              <li>Mỗi thành viên đóng kỳ hiện tại.</li>
              <li>Thành viên đăng ký hốt hoặc bỏ qua lượt.</li>
              <li>Chốt người hốt kỳ này.</li>
              <li>Kỳ cuối sẽ tự động chuyển tiền cho người hốt cuối khi đủ điều kiện.</li>
            </ol>
          </div>
        )}

        {/* Demo Mode Stepper */}
        <DemoMode
          address={address}
          tokenAddress={tokenAddr}
          lendingAddress={lendingAddr}
          chainId={chainId}
          onPoolRefresh={handleDemoPoolRefresh}
        />

        {/* Settings + Wallet */}
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

        {/* Pool Dashboard + Actions */}
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

        {/* Timeline + Receivers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Timeline pool={pool} />
          <ReceiverPanels
            address={address}
            lendingAddress={lendingAddr}
            poolId={activePoolId}
          />
        </div>

        {/* Transaction History */}
        <TransactionHistory />
      </main>

      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-xs text-slate-400">
          Vòng Hụi Cộng Đồng — Demo on Hardhat Localhost &amp; Sepolia Testnet
        </div>
      </footer>
    </div>
  );
}
