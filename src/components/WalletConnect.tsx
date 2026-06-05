import { isSupportedChain, getChainName, shortenAddress } from "../lib/ethers";

interface WalletConnectProps {
  address: string;
  chainId: number | null;
  onConnect: () => Promise<void>;
  connecting: boolean;
}

export default function WalletConnect({
  address,
  chainId,
  onConnect,
  connecting,
}: WalletConnectProps) {
  const supported = chainId !== null && isSupportedChain(chainId);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-800">
          Community ROSCA / Hụi Platform
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {chainId !== null && (
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              supported
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {getChainName(chainId)}
          </span>
        )}
        {address ? (
          <span className="text-sm font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            {shortenAddress(address)}
          </span>
        ) : (
          <button
            onClick={onConnect}
            disabled={connecting}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {connecting ? "Đang kết nối..." : "Kết nối MetaMask"}
          </button>
        )}
      </div>
      {chainId !== null && !supported && (
        <div className="w-full bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2 rounded-lg">
          Vui lòng chuyển sang Hardhat Localhost hoặc Sepolia testnet.
        </div>
      )}
    </div>
  );
}
