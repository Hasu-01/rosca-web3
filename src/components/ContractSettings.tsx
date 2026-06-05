import { useState, useEffect } from "react";
import {
  saveTokenAddress,
  saveLendingAddress,
  clearSavedAddresses,
  isValidAddress,
} from "../lib/ethers";

interface ContractSettingsProps {
  tokenAddress: string;
  lendingAddress: string;
  onTokenChange: (addr: string) => void;
  onLendingChange: (addr: string) => void;
}

export default function ContractSettings({
  tokenAddress,
  lendingAddress,
  onTokenChange,
  onLendingChange,
}: ContractSettingsProps) {
  const [tokenInput, setTokenInput] = useState(tokenAddress);
  const [lendingInput, setLendingInput] = useState(lendingAddress);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTokenInput(tokenAddress);
    setLendingInput(lendingAddress);
  }, [tokenAddress, lendingAddress]);

  const handleSave = () => {
    if (!isValidAddress(tokenInput) || !isValidAddress(lendingInput)) {
      alert("Địa chỉ Ethereum không hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }
    saveTokenAddress(tokenInput);
    saveLendingAddress(lendingInput);
    onTokenChange(tokenInput);
    onLendingChange(lendingInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    clearSavedAddresses();
    setTokenInput("");
    setLendingInput("");
    onTokenChange("");
    onLendingChange("");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">
        Thiết lập hợp đồng
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Dán địa chỉ token demo và hợp đồng hụi để website kết nối đúng với smart contract bạn đã deploy.
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1">
            Địa chỉ MockERC20
          </label>
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600 block mb-1">
            Địa chỉ CommunityLending
          </label>
          <input
            type="text"
            value={lendingInput}
            onChange={(e) => setLendingInput(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saved ? "Đã lưu!" : "Lưu địa chỉ"}
          </button>
          <button
            onClick={handleClear}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-slate-300"
          >
            Xóa đã lưu
          </button>
        </div>
        {tokenAddress && lendingAddress && (
          <div className="text-xs text-slate-500 mt-1">
            Đã lưu: Token {tokenInput.slice(0, 8)}... | Hợp đồng {lendingInput.slice(0, 8)}...
          </div>
        )}
      </div>
    </div>
  );
}
