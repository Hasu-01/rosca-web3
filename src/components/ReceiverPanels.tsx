import { useState, useCallback } from "react";
import {
  getSigner,
  getLendingContract,
  shortenAddress,
  formatTokenAmount,
  isValidAddress,
} from "../lib/ethers";

interface ReceiverPanelsProps {
  address: string;
  lendingAddress: string;
  poolId: number;
}

export default function ReceiverPanels({
  address,
  lendingAddress,
  poolId,
}: ReceiverPanelsProps) {
  const [selectedReceiver, setSelectedReceiver] = useState<string>("");
  const [selectedPayout, setSelectedPayout] = useState<string>("");
  const [finalReceiver, setFinalReceiver] = useState<string>("");
  const [loadingSel, setLoadingSel] = useState(false);
  const [loadingFinal, setLoadingFinal] = useState(false);
  const [msg, setMsg] = useState("");

  const checkSelected = useCallback(async () => {
    if (!lendingAddress || !isValidAddress(lendingAddress)) {
      setMsg("Vui lòng nhập địa chỉ CommunityLending.");
      return;
    }
    setLoadingSel(true);
    setMsg("");
    try {
      const signer = await getSigner();
      if (!signer) return;
      const contract = getLendingContract(lendingAddress, signer);
      const [receiver, payout] = await contract.getCurrentSelectedReceiver(
        poolId
      );
      setSelectedReceiver(receiver);
      setSelectedPayout(formatTokenAmount(payout));
    } catch (err: any) {
      setMsg(
        `Lỗi: ${err?.reason ?? err?.message ?? "Không thể kiểm tra"}`
      );
    } finally {
      setLoadingSel(false);
    }
  }, [lendingAddress, poolId]);

  const checkFinal = useCallback(async () => {
    if (!lendingAddress || !isValidAddress(lendingAddress)) {
      setMsg("Vui lòng nhập địa chỉ CommunityLending.");
      return;
    }
    setLoadingFinal(true);
    setMsg("");
    try {
      const signer = await getSigner();
      if (!signer) return;
      const contract = getLendingContract(lendingAddress, signer);
      const receiver = await contract.getFinalReceiver(poolId);
      setFinalReceiver(receiver);
    } catch (err: any) {
      setMsg(
        `Lỗi: ${err?.reason ?? err?.message ?? "Không thể kiểm tra"}`
      );
    } finally {
      setLoadingFinal(false);
    }
  }, [lendingAddress, poolId]);

  const ZERO = "0x0000000000000000000000000000000000000000";

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Người hốt kỳ này
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Smart contract tự chọn người chấp nhận nhận ít nhất trong kỳ.
        </p>
        <button
          onClick={checkSelected}
          disabled={loadingSel || !address}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-slate-300 disabled:opacity-50 mb-3"
        >
          {loadingSel ? "Đang kiểm tra..." : "Kiểm tra người được chọn"}
        </button>
        {selectedReceiver && selectedReceiver !== ZERO && (
          <div className="bg-slate-50 rounded-lg p-3 space-y-1">
            <div className="text-sm">
              <span className="text-slate-500">Người hốt:</span>{" "}
              <span className="font-mono text-xs text-slate-800">
                {shortenAddress(selectedReceiver)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-slate-500">Mức nhận thấp nhất:</span>{" "}
              <span className="font-semibold text-slate-800">
                {selectedPayout} cUSD
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Người hốt cuối
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Ở kỳ cuối, người chưa từng hốt sẽ nhận phần còn lại sau khi các
          người đã hốt đóng đủ kỳ cuối.
        </p>
        <button
          onClick={checkFinal}
          disabled={loadingFinal || !address}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-slate-300 disabled:opacity-50 mb-3"
        >
          {loadingFinal ? "Đang kiểm tra..." : "Kiểm tra người hốt cuối"}
        </button>
        {finalReceiver && finalReceiver !== ZERO && (
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <div className="text-sm">
              <span className="text-amber-700">Người hốt cuối:</span>{" "}
              <span className="font-mono text-xs text-amber-900">
                {shortenAddress(finalReceiver)}
              </span>
            </div>
          </div>
        )}
      </div>

      {msg && (
        <div className="text-sm px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 break-all">
          {msg}
        </div>
      )}
    </div>
  );
}
