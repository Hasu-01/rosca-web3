import { useState, useCallback } from "react";
import {
  getSigner,
  getLendingContract,
  formatTokenAmount,
  parseTokenAmount,
  isValidAddress,
  shortenAddress,
} from "../lib/ethers";
import type { PoolData } from "../lib/types";
import {
  PoolStatus,
  RoundPhase,
  POOL_STATUS_LABELS,
  ROUND_PHASE_LABELS,
} from "../lib/types";

interface PoolDashboardProps {
  address: string;
  lendingAddress: string;
  onPoolLoaded: (pool: PoolData) => void;
}

export default function PoolDashboard({
  address,
  lendingAddress,
  onPoolLoaded,
}: PoolDashboardProps) {
  const [poolIdInput, setPoolIdInput] = useState("1");
  const [pool, setPool] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [poolName, setPoolName] = useState("Hụi nhóm bạn thân");
  const [contributionAmt, setContributionAmt] = useState("10");
  const [maxMembers, setMaxMembers] = useState("3");
  const [creating, setCreating] = useState(false);

  const loadPool = useCallback(async () => {
    if (!lendingAddress || !isValidAddress(lendingAddress)) {
      setMsg("Vui lòng nhập địa chỉ CommunityLending.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const signer = await getSigner();
      if (!signer) return;
      const contract = getLendingContract(lendingAddress, signer);
      const raw = await contract.pools(Number(poolIdInput));
      const data: PoolData = {
        id: Number(raw.id),
        name: raw.name,
        creator: raw.creator,
        contributionAmount: raw.contributionAmount,
        maxMembers: Number(raw.maxMembers),
        currentMembers: Number(raw.currentMembers),
        currentRound: Number(raw.currentRound),
        totalRounds: Number(raw.totalRounds),
        poolBalance: raw.poolBalance,
        finalReceiverReserve: raw.finalReceiverReserve,
        status: Number(raw.status) as PoolStatus,
        phase: Number(raw.phase) as RoundPhase,
      };
      setPool(data);
      onPoolLoaded(data);
    } catch (err: any) {
      setMsg(
        `Lỗi: ${err?.reason ?? err?.message ?? "Không thể tải thông tin"}`
      );
    } finally {
      setLoading(false);
    }
  }, [lendingAddress, poolIdInput, onPoolLoaded]);

  const createPool = async () => {
    if (!lendingAddress || !isValidAddress(lendingAddress)) {
      setMsg("Vui lòng nhập địa chỉ CommunityLending.");
      return;
    }
    if (!poolName.trim()) {
      setMsg("Vui lòng nhập tên vòng hụi.");
      return;
    }
    setCreating(true);
    setMsg("");
    try {
      const signer = await getSigner();
      if (!signer) return;
      const contract = getLendingContract(lendingAddress, signer);
      const amount = parseTokenAmount(contributionAmt);
      const tx = await contract.createPool(
        poolName,
        amount,
        Number(maxMembers)
      );
      setMsg(`Đang tạo vòng hụi... Tx: ${tx.hash}`);
      await tx.wait();
      setMsg("Tạo vòng hụi thành công!");
      setPoolName("Hụi nhóm bạn thân");
    } catch (err: any) {
      setMsg(
        `Lỗi: ${err?.reason ?? err?.message ?? "Giao dịch bị từ chối"}`
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Tạo vòng hụi mới
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Số thành viên cũng chính là số kỳ. Mỗi người chỉ được hốt một lần.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">
              Tên vòng hụi
            </label>
            <input
              type="text"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              placeholder="Hụi nhóm bạn thân"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1">
                Số tiền góp mỗi kỳ
              </label>
              <input
                type="text"
                value={contributionAmt}
                onChange={(e) => setContributionAmt(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1">
                Số thành viên
              </label>
              <input
                type="text"
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                placeholder="3"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={createPool}
            disabled={creating || !address}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {creating ? "Đang tạo..." : "Tạo vòng hụi"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Xem thông tin vòng hụi
        </h2>
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-600 block mb-1">
              Mã vòng hụi
            </label>
            <input
              type="text"
              value={poolIdInput}
              onChange={(e) => setPoolIdInput(e.target.value)}
              placeholder="1"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadPool}
              disabled={loading || !address}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-slate-300 disabled:opacity-50"
            >
              {loading ? "Đang tải..." : "Tải thông tin"}
            </button>
          </div>
        </div>

        {pool && (
          <div className="grid grid-cols-2 gap-3">
            <StatusCard label="Vòng hụi hiện tại" value={pool.name} />
            <StatusCard label="Kỳ hiện tại / Tổng số kỳ" value={`${pool.currentRound} / ${pool.totalRounds}`} />
            <StatusCard label="Số thành viên đã tham gia" value={`${pool.currentMembers} / ${pool.maxMembers}`} />
            <StatusCard label="Trạng thái vòng hụi" value={POOL_STATUS_LABELS[pool.status]} highlight={pool.status === PoolStatus.ACTIVE} />
            <StatusCard label="Giai đoạn hiện tại" value={ROUND_PHASE_LABELS[pool.phase]} highlight={pool.phase === RoundPhase.CONTRIBUTING || pool.phase === RoundPhase.OFFERING} />
            <StatusCard label="Số dư đang giữ trong hợp đồng" value={`${formatTokenAmount(pool.poolBalance)} cUSD`} />
            <StatusCard label="Quỹ giữ lại cho người hốt cuối" value={`${formatTokenAmount(pool.finalReceiverReserve)} cUSD`} />
            <StatusCard label="Người tạo vòng hụi" value={shortenAddress(pool.creator)} mono />
          </div>
        )}
      </div>

      {msg && (
        <div
          className={`text-sm px-4 py-2 rounded-lg break-all ${
            msg.includes("thành công")
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

function StatusCard({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-3 ${
        highlight
          ? "bg-blue-50 border border-blue-200"
          : "bg-slate-50 border border-slate-200"
      }`}
    >
      <div className="text-[11px] text-slate-500 mb-0.5">{label}</div>
      <div
        className={`text-sm font-semibold ${
          highlight ? "text-blue-700" : "text-slate-800"
        } ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
