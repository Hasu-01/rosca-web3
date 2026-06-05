import { RoundPhase, ROUND_PHASE_LABELS } from "../lib/types";
import type { PoolData } from "../lib/types";

interface TimelineProps {
  pool: PoolData | null;
}

export default function Timeline({ pool }: TimelineProps) {
  if (!pool) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">
          Payout Timeline
        </h2>
        <p className="text-sm text-slate-400">
          T\u1ea3i pool \u0111\u1ec3 xem timeline.
        </p>
      </div>
    );
  }

  const rounds = pool.totalRounds;
  const current = pool.currentRound;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        Payout Timeline
      </h2>
      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {Array.from({ length: rounds }, (_, i) => {
          const roundNum = i + 1;
          const isPast = roundNum < current;
          const isCurrent = roundNum === current;
          const isLast = roundNum === rounds;

          let label = "";
          let textClass = "text-slate-500";
          let dotClass = "bg-slate-300";

          if (isPast) {
            label = "\u0110\u00e3 ho\u00e0n th\u00e0nh";
            textClass = "text-emerald-700";
            dotClass = "bg-emerald-500";
          } else if (isCurrent && isLast) {
            label = "K\u1ef3 cu\u1ed1i";
            textClass = "text-amber-700";
            dotClass = "bg-amber-500";
          } else if (isCurrent) {
            if (pool.phase === RoundPhase.CONTRIBUTING) {
              label = "\u0110ang g\u00f3p";
            } else if (pool.phase === RoundPhase.OFFERING) {
              label = "\u0110ang ch\u1ecdn ng\u01b0\u1eddi h\u1ed1t";
            } else {
              label = ROUND_PHASE_LABELS[pool.phase];
            }
            textClass = "text-blue-700";
            dotClass = "bg-blue-500";
          }

          return (
            <div key={i} className="flex flex-col items-center min-w-[80px]">
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      isPast ? "bg-emerald-300" : "bg-slate-200"
                    }`}
                  />
                )}
                <div
                  className={`w-4 h-4 rounded-full border-2 ${dotClass} ${
                    isCurrent
                      ? "ring-4 ring-blue-100 scale-125"
                      : ""
                  } transition-all`}
                />
                {i < rounds - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      isPast ? "bg-emerald-300" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
              <div className="mt-2 text-center">
                <div
                  className={`text-xs font-semibold ${textClass}`}
                >
                  K\u1ef3 {roundNum}
                </div>
                <div
                  className={`text-[10px] mt-0.5 ${textClass} opacity-80`}
                >
                  {label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
