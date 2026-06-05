import { useState, useCallback } from "react";
import {
  getSigner,
  getLendingContract,
  shortenAddress,
  isValidAddress,
} from "../lib/ethers";
import type { MemberData } from "../lib/types";

interface MembersPanelProps {
  address: string;
  lendingAddress: string;
  poolId: number;
}

export default function MembersPanel({
  address,
  lendingAddress,
  poolId,
}: MembersPanelProps) {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const loadMembers = useCallback(async () => {
    if (!lendingAddress || !isValidAddress(lendingAddress)) {
      setMsg("Vui lòng nhập địa chỉ CommunityLending.");
      return;
    }
    if (!poolId) {
      setMsg("Vui lòng nhập Pool ID.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const signer = await getSigner();
      if (!signer) return;
      const contract = getLendingContract(lendingAddress, signer);
      const raw = await contract.getPoolMembers(poolId);
      const data: MemberData[] = raw.map((m: any) => ({
        wallet: m.wallet,
        hasReceived: m.hasReceived,
      }));
      setMembers(data);
    } catch (err: any) {
      setMsg(
        `Lỗi: ${err?.reason ?? err?.message ?? "Không thể tải thành viên"}`
      );
    } finally {
      setLoading(false);
    }
  }, [lendingAddress, poolId]);

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Thành viên</h2>
        <button
          onClick={loadMembers}
          disabled={loading || !address}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors border border-slate-300 disabled:opacity-50"
        >
          {loading ? "Đang tải..." : "Tải thành viên"}
        </button>
      </div>
      {members.length > 0 ? (
        <div className="space-y-2">
          {members.map((m, i) => {
            const isMe =
              address.toLowerCase() === m.wallet.toLowerCase();
            return (
              <div
                key={i}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  isMe
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-slate-50 border border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs">#{i + 1}</span>
                  <span className="font-mono text-xs text-slate-700">
                    {shortenAddress(m.wallet)}
                  </span>
                  {isMe && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      Bạn
                    </span>
                  )}
                  <button
                    onClick={() => copyAddr(m.wallet)}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    title="Copy địa chỉ"
                  >
                    Copy
                  </button>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    m.hasReceived
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {m.hasReceived ? "Đã hốt" : "Chưa hốt"}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          Chưa có thành viên. Bấm "Tải thành viên" để xem.
        </p>
      )}
      {msg && (
        <div className="text-sm mt-2 text-slate-600">{msg}</div>
      )}
    </div>
  );
}
