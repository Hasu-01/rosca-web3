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
  [PoolStatus.OPEN]: "Đang mở",
  [PoolStatus.ACTIVE]: "Đang hoạt động",
  [PoolStatus.COMPLETED]: "Đã hoàn thành",
  [PoolStatus.CANCELLED]: "Đã hủy",
};

export const ROUND_PHASE_LABELS: Record<RoundPhase, string> = {
  [RoundPhase.NOT_STARTED]: "Chưa bắt đầu",
  [RoundPhase.CONTRIBUTING]: "Đang góp kỳ này",
  [RoundPhase.OFFERING]: "Đang chọn người hốt",
  [RoundPhase.COMPLETED]: "Đã hoàn thành",
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
