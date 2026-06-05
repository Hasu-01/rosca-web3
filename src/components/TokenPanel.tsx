import { useState, useCallback } from "react";
import {
  getSigner,
  getTokenContract,
  formatEther,
  parseEther,
  isValidAddress,
} from "../lib/ethers";

interface TokenPanelProps {
  address: string;
  tokenAddress: string;
  lendingAddress: string;
}

export default function TokenPanel({
  address,
  tokenAddress,
  lendingAddress,
}: TokenPanelProps) {
  const [balance, setBalance] = useState<string>("");
  const [allowance, setAllowance] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [mintLoading, setMintLoading] = useState(false);
  const [mintTo, setMintTo] = useState(address);
  const [mintAmount, setMintAmount] = useState("1000");
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    if (!address || !tokenAddress || !isValidAddress(tokenAddress)) return;
    setLoading(true);
    try {
      const signer = await getSigner();
      if (!signer) return;
      const contract = getTokenContract(tokenAddress, signer);
      const bal = await contract.balanceOf(address);
      setBalance(formatEther(bal));
      if (lendingAddress && isValidAddress(lendingAddress)) {
        const alw = await contract.allowance(address, lendingAddress);
        setAllowance(formatEther(alw));
      }
    } catch (err: any) {
      setMsg(`Lỗi: ${err?.reason ?? err?.message ?? "Không thể đọc balance"}`);
    } finally {
      setLoading(false);
    }
  }, [address, tokenAddress, lendingAddress]);

  const approve = async () => {
    if (!tokenAddress || !lendingAddress) {
      setMsg("Vui lòng nhập địa chỉ contract trước.");
      return;
    }
    setApproveLoading(true);
    setMsg("");
    try {
      const signer = await getSigner();
      if (!signer) return;
      const contract = getTokenContract(tokenAddress, signer);
      const amount = parseEther("1000000000000000000000");
      const tx = await contract.approve(lendingAddress, amount);
      setMsg(`Đang chờ xác nhận... Tx: ${tx.hash}`);
      await tx.wait();
      setMsg("Approve thành công!");
      await refresh();
    } catch (err: any) {
      setMsg(
        `Lỗi approve: ${err?.reason ?? err?.message ?? "Giao dịch bị từ chối"}`
      );
    } finally {
      setApproveLoading(false);
    }
  };

  const mint = async () => {
    if (!tokenAddress || !mintTo) {
      setMsg("Thiếu địa chỉ nhận hoặc địa chỉ token.");
      return;
    }
    if (!isValidAddress(mintTo)) {
      setMsg("Địa chỉ nhận không hợp lệ.");
      return;
    }
    setMintLoading(true);
    setMsg("");
    try {
      const signer = await getSigner();
      if (!signer) return;
      const contract = getTokenContract(tokenAddress, signer);
      const amount = parseEther(mintAmount);
      const tx = await contract.mint(mintTo, amount);
      setMsg(`Đang mint... Tx: ${tx.hash}`);
      await tx.wait();
      setMsg("Mint thành công!");
      await refresh();
    } catch (err: any) {
      setMsg(
        `Lỗi mint: ${err?.reason ?? err?.message ?? "Giao dịch bị từ chối"}`
      );
    } finally {
      setMintLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Wallet Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Ví & Token
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Số dư cUSD</div>
            <div className="text-lg font-semibold text-slate-800">
              {balance ? `${balance} cUSD` : "—"}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Allowance</div>
            <div className="text-lg font-semibold text-slate-800">
              {allowance ? `${allowance} cUSD` : "—"}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            disabled={loading || !address}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-slate-300 disabled:opacity-50"
          >
            {loading ? "Đang tải..." : "Làm mới số dư"}
          </button>
          <button
            onClick={approve}
            disabled={approveLoading || !address}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {approveLoading ? "Đang approve..." : "Approve Token"}
          </button>
        </div>
      </div>

      {/* Demo Mint */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">
          Demo Mint cUSD
        </h2>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg mb-3">
          Chỉ dùng cho demo local/testnet. Token này không có giá trị thật.
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">
              Địa chỉ nhận
            </label>
            <input
              type="text"
              value={mintTo}
              onChange={(e) => setMintTo(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">
              Số lượng
            </label>
            <input
              type="text"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="1000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={mint}
            disabled={mintLoading || !address}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {mintLoading ? "Đang mint..." : "Mint cUSD"}
          </button>
        </div>
      </div>

      {msg && (
        <div className="text-sm px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 break-all">
          {msg}
        </div>
      )}
    </div>
  );
}
