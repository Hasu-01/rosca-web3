import { useState } from "react";
import {
  getSigner,
  getLendingContract,
  parseTokenAmount,
  isValidAddress,
  saveTxRecord,
} from "../lib/ethers";

interface PoolActionsProps {
  address: string;
  lendingAddress: string;
  chainId: number | null;
  poolId: number;
  onActionComplete: () => void;
}

export default function PoolActions({
  address,
  lendingAddress,
  chainId,
  poolId,
  onActionComplete,
}: PoolActionsProps) {
  const [acceptedPayout, setAcceptedPayout] = useState("25");
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [lastTx, setLastTx] = useState("");

  const checkPrereqs = (): boolean => {
    if (!address) {
      setMsg("Vui lòng kết nối ví trước.");
      return false;
    }
    if (!lendingAddress || !isValidAddress(lendingAddress)) {
      setMsg("Vui lòng nhập địa chỉ CommunityLending.");
      return false;
    }
    return true;
  };

  const execTx = async (
    action: string,
    fn: () => Promise<any>
  ) => {
    if (!checkPrereqs()) return;
    setLoading(action);
    setMsg("");
    setLastTx("");
    try {
      const tx = await fn();
      setMsg(`${action}: Đang chờ xác nhận...`);
      setLastTx(tx.hash);
      await tx.wait();
      saveTxRecord({
        hash: tx.hash,
        action,
        from: address,
        timestamp: Date.now(),
        chainId: chainId ?? 0,
      });
      setMsg(`${action} thành công!`);
      onActionComplete();
    } catch (err: any) {
      setMsg(
        `${action} lỗi: ${err?.reason ?? err?.message ?? "Giao dịch bị từ chối"}`
      );
    } finally {
      setLoading(null);
    }
  };

  const joinPool = () =>
    execTx("Tham gia vòng hụi", async () => {
      const signer = await getSigner();
      const contract = getLendingContract(lendingAddress, signer!);
      return contract.joinPool(poolId);
    });

  const startPool = () =>
    execTx("Bắt đầu vòng hụi", async () => {
      const signer = await getSigner();
      const contract = getLendingContract(lendingAddress, signer!);
      return contract.startPool(poolId);
    });

  const deposit = () =>
    execTx("Đóng kỳ này", async () => {
      const signer = await getSigner();
      const contract = getLendingContract(lendingAddress, signer!);
      return contract.deposit(poolId);
    });

  const submitOffer = () =>
    execTx("Đăng ký hốt kỳ này", async () => {
      if (!acceptedPayout || Number(acceptedPayout) <= 0) {
        throw new Error("Vui lòng nhập số tiền chấp nhận nhận.");
      }
      const signer = await getSigner();
      const contract = getLendingContract(lendingAddress, signer!);
      return contract.submitWithdrawalOffer(
        poolId,
        parseTokenAmount(acceptedPayout)
      );
    });

  const skipOffer = () =>
    execTx("Bỏ qua lượt hốt", async () => {
      const signer = await getSigner();
      const contract = getLendingContract(lendingAddress, signer!);
      return contract.skipWithdrawalOffer(poolId);
    });

  const withdrawRound = () =>
    execTx("Chốt người hốt kỳ này", async () => {
      const signer = await getSigner();
      const contract = getLendingContract(lendingAddress, signer!);
      return contract.withdrawCurrentRound(poolId);
    });

  const btnDisabled = () =>
    loading !== null || !address || !lendingAddress;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        Thao tác trong vòng hụi
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ActionBtn
          label="Tham gia vòng hụi"
          sublabel="joinPool"
          onClick={joinPool}
          loading={loading === "Tham gia vòng hụi"}
          disabled={btnDisabled()}
        />
        <ActionBtn
          label="Bắt đầu vòng hụi"
          sublabel="startPool"
          onClick={startPool}
          loading={loading === "Bắt đầu vòng hụi"}
          disabled={btnDisabled()}
        />
        <ActionBtn
          label="Đóng kỳ này"
          sublabel="deposit"
          onClick={deposit}
          loading={loading === "Đóng kỳ này"}
          disabled={btnDisabled()}
        />
        <ActionBtn
          label="Bỏ qua lượt hốt"
          sublabel="skipWithdrawalOffer"
          onClick={skipOffer}
          loading={loading === "Bỏ qua lượt hốt"}
          disabled={btnDisabled()}
        />
        <ActionBtn
          label="Chốt người hốt kỳ này"
          sublabel="withdrawCurrentRound"
          onClick={withdrawRound}
          loading={loading === "Chốt người hốt kỳ này"}
          disabled={btnDisabled()}
        />
      </div>

      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <label className="text-sm font-medium text-slate-600 block mb-1">
          Số tiền chấp nhận nhận
        </label>
        <p className="text-[11px] text-slate-400 mb-2">
          Người chấp nhận nhận ít nhất sẽ được smart contract chọn hốt kỳ này.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={acceptedPayout}
            onChange={(e) => setAcceptedPayout(e.target.value)}
            placeholder="25"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <ActionBtn
            label="Đăng ký hốt kỳ này"
            sublabel="submitWithdrawalOffer"
            onClick={submitOffer}
            loading={loading === "Đăng ký hốt kỳ này"}
            disabled={btnDisabled() || !acceptedPayout}
          />
        </div>
      </div>

      {msg && (
        <div
          className={`mt-3 text-sm px-4 py-2 rounded-lg break-all ${
            msg.includes("thành công")
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-slate-50 border border-slate-200 text-slate-700"
          }`}
        >
          {msg}
        </div>
      )}
      {lastTx && (
        <div className="mt-2 text-xs font-mono text-slate-500 break-all">
          Tx: {lastTx}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  label,
  sublabel,
  onClick,
  loading,
  disabled,
}: {
  label: string;
  sublabel: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-left"
    >
      <span className="block">{loading ? "Đang xử lý..." : label}</span>
      <span className="block text-[10px] text-blue-200 mt-0.5 font-mono">
        {sublabel}
      </span>
    </button>
  );
}
