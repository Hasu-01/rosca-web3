import { useState, useCallback } from "react";
import {
  getSigner,
  getTokenContract,
  formatTokenAmount,
  parseTokenAmount,
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
      setBalance(formatTokenAmount(bal));
      if (lendingAddress && isValidAddress(lendingAddress)) {
        const alw = await contract.allowance(address, lendingAddress);
        setAllowance(formatTokenAmount(alw));
      }
    } catch (err: any) {
      setMsg(`Lỗi: ${err?.reason ?? err?.message ?? "Không thể đọc số dư"}`);
    } finally {
      setLoading(false);
    }
  }, [address, tokenAddress, lendingAddress]);

  const approve = async () => {
    if (!tokenAddress || !lendingAddress) {
      setMsg("Vui lòng nhập địa chỉ hợp đồng trước.");
      return;
    }
    setApproveLoading(true);
    setMsg("");
    try {
      const signer = await getSigner();
      if (!signer) return;
      const contract = getTokenContract(tokenAddress, signer);
      const amount = parseTokenAmount("1000");
      const tx = await contract.approve(lendingAddress, amount);
      setMsg(`Đang chờ xác nhận... Tx: ${tx.hash}`);
      await tx.wait();
      setMsg("Đã cho phép hợp đồng dùng token!");
      await refresh();
    } catch (err: any) {
      setMsg(
        `Lỗi: ${err?.reason ?? err?.message ?? "Giao dịch bị từ chối"}`
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
      const amount = parseTokenAmount(mintAmount);
      const tx = await contract.mint(mintTo, amount);
      setMsg(`Đang nạp... Tx: ${tx.hash}`);
      await tx.wait();
      setMsg("Nạp token thành công!");
      await refresh();
    } catch (err: any) {
      setMsg(
        `Lỗi: ${err?.reason ?? err?.message ?? "Giao dịch bị từ chối"}`
      );
    } finally {
      setMintLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Ví của bạn
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Số dư token góp hụi</div>
            <div className="text-lg font-semibold text-slate-800">
              {balance ? `${balance} cUSD` : "—"}
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Hạn mức đã cho phép</div>
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
            {loading ? "Đang tải..." : "Cập nhật số dư"}
          </button>
          <button
            onClick={approve}
            disabled={approveLoading || !address}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {approveLoading ? "Đang xác nhận..." : "Cho phép hợp đồng dùng token"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">
          Nạp token demo
        </h2>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg mb-3">
          Token này chỉ dùng để demo trên local/testnet, không có giá trị thật.
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">
              Ví nhận token
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
              Số token muốn nạp
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
            {mintLoading ? "Đang nạp..." : "Nạp token demo"}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`text-sm px-4 py-2 rounded-lg break-all ${
            msg.includes("thành công") || msg.includes("Đã cho")
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-slate-50 border border-slate-200 text-slate-700"
          }`}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
