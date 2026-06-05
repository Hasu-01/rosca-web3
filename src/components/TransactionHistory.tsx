import { useState } from "react";
import {
  loadTxHistory,
  clearTxHistory,
  shortenAddress,
  getExplorerUrl,
} from "../lib/ethers";

export default function TransactionHistory() {
  const [txs, setTxs] = useState(loadTxHistory());

  const refresh = () => setTxs(loadTxHistory());

  const handleClear = () => {
    clearTxHistory();
    setTxs([]);
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">
          Lịch sử giao dịch
        </h2>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border border-slate-300"
          >
            Làm mới
          </button>
          <button
            onClick={handleClear}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border border-slate-300"
          >
            Xóa lịch sử
          </button>
        </div>
      </div>
      {txs.length === 0 ? (
        <p className="text-sm text-slate-400">Chưa có giao dịch nào.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {txs.map((tx, i) => {
            const explorerUrl = getExplorerUrl(tx.chainId, tx.hash);
            const time = new Date(tx.timestamp).toLocaleString("vi-VN");
            return (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-700">
                    {tx.action}
                  </div>
                  <div className="text-xs text-slate-400 font-mono truncate">
                    Mã giao dịch: {shortenAddress(tx.hash)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Từ: {shortenAddress(tx.from)} | {time}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => copyHash(tx.hash)}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Sao chép
                  </button>
                  {explorerUrl ? (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Etherscan
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Giao dịch local</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
