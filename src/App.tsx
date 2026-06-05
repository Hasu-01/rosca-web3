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
      alert("Vui lòng cài đặt MetaMask để sử dụng ứng dụng.");
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
            Không tìm thấy MetaMask. Vui lòng cài đặt MetaMask extension để sử dụng ứng dụng.
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Nền tảng ROSCA / Hụi cộng đồng trên blockchain
          </p>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            {showGuide ? "Ẩn hướng dẫn" : "Xem hướng dẫn demo"}
          </button>
        </div>

        {showGuide && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">
              Hướng dẫn Demo
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
              <li><strong>Kết nối ví</strong> — Bấm "Kết nối MetaMask" ở trên.</li>
              <li><strong>Lưu địa chỉ contract</strong> — Nhập địa chỉ MockERC20 và CommunityLending đã deploy.</li>
              <li><strong>Mint test token</strong> — Dùng panel "Demo Mint cUSD" để lấy cUSD cho demo.</li>
              <li><strong>Tạo vòng hụi</strong> — Nhập tên, số tiền góp, số thành viên rồi bấm "Tạo Pool".</li>
              <li><strong>Thành viên tham gia</strong> — Mỗi ví bấm "Tham gia Pool" (joinPool). Creator cũng phải join.</li>
              <li><strong>Bắt đầu pool</strong> — Khi đủ thành viên, creator bấm "Bắt đầu Pool".</li>
              <li><strong>Approve token</strong> — Bấm "Approve Token" để cho phép contract chuyển cUSD.</li>
              <li><strong>Đóng hụi</strong> — Mỗi thành viên bấm "Đóng hụi" (deposit).</li>
              <li><strong>Gửi offer / skip</strong> — Khi đủ đóng, thành viên chưa hốt gửi mức chấp nhận nhận hoặc skip.</li>
              <li><strong>Chốt kỳ</strong> — Bấm "Chốt kỳ này" để chuyển tiền cho người chấp nhận nhận ít nhất.</li>
              <li><strong>Kỳ cuối</strong> — Người hốt cuối không đóng. Khi các người đã hốt đóng đủ, contract tự động chuyển tiền cho người cuối.</li>
            </ol>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <strong>Lưu ý quan trọng:</strong> Creator không tự động là thành viên — phải joinPool. Người đã hốt không được offer lại. Người hốt cuối không đóng ở kỳ cuối. Final payout tự động khi đủ đóng.
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
          Community ROSCA / Hụi Platform — Demo on Hardhat Localhost &amp; Sepolia Testnet
        </div>
      </footer>
    </div>
  );
}
