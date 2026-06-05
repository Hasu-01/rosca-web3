export const PoolStatus = {
  OPEN: 0,
  ACTIVE: 1,
  COMPLETED: 2,
  CANCELLED: 3,
} as const;

export type PoolStatus = (typeof PoolStatus)[keyof typeof PoolStatus];

export const RoundPhase = {
  NOT_STARTED: 0,
  CONTRIBUTING: 1,
  OFFERING: 2,
  COMPLETED: 3,
} as const;

export type RoundPhase = (typeof RoundPhase)[keyof typeof RoundPhase];

export const POOL_STATUS_LABELS: Record<PoolStatus, string> = {
  [PoolStatus.OPEN]: "\u0110ang m\u1edf",
  [PoolStatus.ACTIVE]: "\u0110ang ho\u1ea1t \u0111\u1ed9ng",
  [PoolStatus.COMPLETED]: "\u0110\u00e3 ho\u00e0n th\u00e0nh",
  [PoolStatus.CANCELLED]: "\u0110\u00e3 hu\u1ef7",
};

export const ROUND_PHASE_LABELS: Record<RoundPhase, string> = {
  [RoundPhase.NOT_STARTED]: "Ch\u01b0a b\u1eaft \u0111\u1ea7u",
  [RoundPhase.CONTRIBUTING]: "\u0110ang g\u00f3p",
  [RoundPhase.OFFERING]: "\u0110ang ch\u1ecdn ng\u01b0\u1eddi h\u1ed1t",
  [RoundPhase.COMPLETED]: "\u0110\u00e3 ho\u00e0n th\u00e0nh",
};

export interface PoolData {
  id: number;
  name: string;
  creator: string;
  contributionAmount: bigint;
  maxMembers: number;
  currentMembers: number;
  currentRound: number;
  totalRounds: number;
  poolBalance: bigint;
  finalReceiverReserve: bigint;
  status: PoolStatus;
  phase: RoundPhase;
}

export interface MemberData {
  wallet: string;
  hasReceived: boolean;
}
