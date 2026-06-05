import { useState } from "react";
import {
  getSigner,
  getLendingContract,
  parseEther,
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
  const [acceptedPayout, setAcceptedPayout] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [lastTx, setLastTx] = useState("");

  const checkPrereqs = (): boolean => {
    if (!address) {
      setMsg("Vui l\u00f2ng k\u1ebft n\u1ed1i v\u00ed tr\u01b0\u1edbc.");
      return false;
    }
    if (!lendingAddress || !isValidAddress(lendingAddress)) {
      setMsg("Vui l\u00f2ng nh\u1eadp \u0111\u1ecba ch\u1ec9 CommunityLending.");
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
      setMsg(`${action}: \u0110ang ch\u1edd x\u00e1c nh\u1eadn...`);
      setLastTx(tx.hash);
      await tx.wait();
      saveTxRecord({
        hash: tx.hash,
        action,
        from: address,
        timestamp: Date.now(),
        chainId: chainId ?? 0,
      });
      setMsg(`${action} th\u00e0nh c\u00f4ng!`);
      onActionComplete();
    } catch (err: any) {
      setMsg(
        `${action} l\u1ed7i: ${err?.reason ?? err?.message ?? "Giao d\u1ecbch b\u1ecb t\u1eeb ch\u1ed1i"}`
      );
    } finally {
      setLoading(null);
    }
  };

  const joinPool = () =>
    execTx("Join Pool", async () => {
      const signer = await getSigner();
      const contract = getLendingContract(lendingAddress, signer!);
      return contract.joinPool(poolId);
    });

  const startPool = () =>
    execTx("Start Pool", async () => {
      const signer = await getSigner();
      const contract = getLendingContract(lendingAddress, signer!);
      return contract.startPool(poolId);
    });

  const deposit = () =>
    execTx("\u0110\u00f3ng h\u1ee5i", async () => {
      const signer = await getSigner();
      const contract = getLendingContract(lendingAddress, signer!);
      return contract.deposit(poolId);
    });

  const submitOffer = () =>
    execTx("Submit Offer", async () => {
      if (!acceptedPayout || Number(acceptedPayout) <= 0) {
        throw new Error("Vui l\u00f2ng nh\u1eadp s\u1ed1 ti\u1ec1n ch\u1ea5p nh\u1eadn nh\u1eadn.");
      }
      const signer = await getSigner();
      const contract = getLendingContract(lendingAddress, signer!);
      return contract.submitWithdrawalOffer(
        poolId,
        parseEther(acceptedPayout)
      );
    });

  const skipOffer = () =>
    execTx("Skip Offer", async () => {
      const signer = await getSigner();
      const contract = getLendingContract(lendingAddress, signer!);
      return contract.skipWithdrawalOffer(poolId);
    });

  const withdrawRound = () =>
    execTx("Withdraw Round", async () => {
      const signer = await getSigner();
      const contract = getLendingContract(lendingAddress, signer!);
      return contract.withdrawCurrentRound(poolId);
    });

  const btnDisabled = () =>
    loading !== null || !address || !lendingAddress;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        Thao t\u00e1c Pool
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ActionBtn
          label="Tham gia Pool"
          sublabel="joinPool"
          onClick={joinPool}
          loading={loading === "Join Pool"}
          disabled={btnDisabled()}
        />
        <ActionBtn
          label="B\u1eaft \u0111\u1ea7u Pool"
          sublabel="startPool"
          onClick={startPool}
          loading={loading === "Start Pool"}
          disabled={btnDisabled()}
        />
        <ActionBtn
          label="\u0110\u00f3ng h\u1ee5i"
          sublabel="deposit"
          onClick={deposit}
          loading={loading === "\u0110\u00f3ng h\u1ee5i"}
          disabled={btnDisabled()}
        />
        <ActionBtn
          label="Skip Offer"
          sublabel="skipWithdrawalOffer"
          onClick={skipOffer}
          loading={loading === "Skip Offer"}
          disabled={btnDisabled()}
        />
        <ActionBtn
          label="Ch\u1ed1t k\u1ef3 n\u00e0y"
          sublabel="withdrawCurrentRound"
          onClick={withdrawRound}
          loading={loading === "Withdraw Round"}
          disabled={btnDisabled()}
        />
      </div>

      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <label className="text-sm font-medium text-slate-600 block mb-1">
          S\u1ed1 ti\u1ec1n ch\u1ea5p nh\u1eadn nh\u1eadn (cUSD)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={acceptedPayout}
            onChange={(e) => setAcceptedPayout(e.target.value)}
            placeholder="25"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <ActionBtn
            label="G\u1eedi Offer"
            sublabel="submitWithdrawalOffer"
            onClick={submitOffer}
            loading={loading === "Submit Offer"}
            disabled={btnDisabled() || !acceptedPayout}
          />
        </div>
      </div>

      {msg && (
        <div
          className={`mt-3 text-sm px-4 py-2 rounded-lg break-all ${
            msg.includes("th\u00e0nh c\u00f4ng")
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
      <span className="block">{loading ? "\u0110ang x\u1eed l\u00fd..." : label}</span>
      <span className="block text-[10px] text-blue-200 mt-0.5 font-mono">
        {sublabel}
      </span>
    </button>
  );
}
