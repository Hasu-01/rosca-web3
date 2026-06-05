import { useState, useCallback } from "react";
import {
  getSigner,
  getLendingContract,
  formatEther,
  parseEther,
  isValidAddress,
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

  // Create pool form
  const [poolName, setPoolName] = useState("");
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
        `Lỗi: ${err?.reason ?? err?.message ?? "Không thể tải pool"}`
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
      setMsg("Vui lòng nhập tên pool.");
      return;
    }
    setCreating(true);
    setMsg("");
    try {
      const signer = await getSigner();
      if (!signer) return;
      const contract = getLendingContract(lendingAddress, signer);
      const amount = parseEther(contributionAmt);
      const tx = await contract.createPool(
        poolName,
        amount,
        Number(maxMembers)
      );
      setMsg(`Đang tạo pool... Tx: ${tx.hash}`);
      await tx.wait();
      setMsg("Tạo pool thành công!");
      setPoolName("");
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
      {/* Create Pool */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">
          Tạo Vòng Hụi
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Số thành viên = số kỳ hụi. Mỗi thành viên sẽ hốt đúng 1 lần.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">
              Tên pool cộng đồng
            </label>
            <input
              type="text"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              placeholder="Student Hui"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1">
                Số tiền góp (cUSD)
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
            {creating ? "Đang tạo..." : "Tạo Pool"}
          </button>
        </div>
      </div>

      {/* Pool Lookup */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Xem Pool
        </h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={poolIdInput}
            onChange={(e) => setPoolIdInput(e.target.value)}
            placeholder="Pool ID"
            className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={loadPool}
            disabled={loading || !address}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-slate-300 disabled:opacity-50"
          >
            {loading ? "Đang tải..." : "Tải Pool"}
          </button>
        </div>

        {pool && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <InfoRow label="Tên" value={pool.name} />
              <InfoRow
                label="Creator"
                value={pool.creator}
                mono
              />
              <InfoRow
                label="Số tiền góp"
                value={`${formatEther(pool.contributionAmount)} cUSD`}
              />
              <InfoRow label="Thành viên tối đa" value={String(pool.maxMembers)} />
              <InfoRow label="Thành viên hiện tại" value={String(pool.currentMembers)} />
              <InfoRow label="Kỳ hiện tại" value={`${pool.currentRound} / ${pool.totalRounds}`} />
              <InfoRow
                label="Pool balance"
                value={`${formatEther(pool.poolBalance)} cUSD`}
              />
              <InfoRow
                label="Dự trữ người hốt cuối"
                value={`${formatEther(pool.finalReceiverReserve)} cUSD`}
              />
              <InfoRow
                label="Trạng thái"
                value={POOL_STATUS_LABELS[pool.status]}
              />
              <InfoRow
                label="Giai đoạn"
                value={ROUND_PHASE_LABELS[pool.phase]}
              />
            </div>
            <div className="flex gap-2 mt-2">
              <StatusBadge
                active={pool.status === PoolStatus.OPEN}
                label={POOL_STATUS_LABELS[pool.status]}
              />
              <StatusBadge
                active={pool.phase === RoundPhase.CONTRIBUTING}
                label={ROUND_PHASE_LABELS[pool.phase]}
              />
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

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <div className="text-slate-500">{label}</div>
      <div className={`text-slate-800 font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {mono && value.length > 16
          ? `${value.slice(0, 8)}...${value.slice(-6)}`
          : value}
      </div>
    </>
  );
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${
        active
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-slate-50 text-slate-600 border border-slate-200"
      }`}
    >
      {label}
    </span>
  );
}
